import { model, Schema, Document } from 'mongoose'
import {createHmac} from 'crypto'
import { getLogger, Logger } from 'log4js';
import * as Config from '../helper/config'
import request from 'sync-request'
import { Updator, User } from './User';
import { IODataStructure } from './IODataStructure';
import { is } from 'typescript-is';

const logger = getLogger(Config.WEBAPI_LOGGER_LEVEL)

function encrypt(secret: string): string{
    //update("bgsn") ?? 总不能用裸的sha256吧。。
    return createHmac('sha256', secret).update("bgsn").digest('hex');
}
// 也不能export呀
interface AuthorizationDS extends Document{
    uuid: string,
    username?: string,
    password?: string,
    wxOpenID?: string,
    wxSessionKey?: string
}

// 不能export这个呀
const AuthorizationModel = model<AuthorizationDS>('Authorization', new Schema({
    uuid: {type: String, required: true, unique: true}, 
    username: {type: String, required: false, unique: true},
    password: {type: String, required: false},
    wxOpenID: {type: String, required: false},
    wxSessionKey: {type: String, required: false}
}))

/**
 * 外部需求：
 *      0) 是否存在某个用户名等唯一标志
 * 
 *      1) 根据特定的验证信息找到一个User对应的uuid，
 *      2) 给定一个uuid和一定的验证信息，判断是否匹配
 *          1) & 2) 但所有验证方法必须是固定的，避免通过uuid + openid这种方式能通过验证
 * 
 *      3) 更新一个人的某些验证信息（用户名，密码，etc）
 *      4) 删除某个uuid对应的验证信息
 *          3) & 4) 这些操作之前，必须通过某种方式进行身份验证
 * 
 *      5) 向数据库添加一个uuid对应的验证信息。需要先确定数据库中没有现存同uuid的信息
 * 
 * 要静态地阻止任何直接获取密码、session_key等信息的可能
 * private 数据在js上仍然可以直接获取，console.log, stringify 都能获取，所以不能有“状态”
 * 于是，就用函数吧
 */

//================================用户名密码登录   开始=========================================

export async function existUsername(username: string): Promise<boolean>{
    return (await AuthorizationModel.find({username: username})).length > 0
}

export async function createEntryWithUsernameAndPassword(uuid: string, username: string, pwd: string)
    :Promise<boolean>{
    pwd = encrypt(pwd)
    try{
        let data = await AuthorizationModel.findOne({uuid: uuid})
        if(data) return false;
        await new AuthorizationModel({
            uuid: uuid,
            username: username,
            password: pwd
        }).save()
        return true
    }catch(err){
        logger.error('Error communicatiing with database')
        return false
    }
}

// 返回值是uuid
export async function loginWithUsernameAndPassword(username: string, password: string):
    Promise<string | null>{
    password = encrypt(password)
    try{
        let data = await AuthorizationModel.find({username: username, password: password})
        if(data.length !== 1) return null
        return data[0].uuid
    }catch(err){
        logger.error('Error communicating with database')    
        return null
    }
}

//================================用户名密码登录   结束=========================================

//================================微信登录   开始=========================================

function sessionTokenUrl(js_code: string){
    return `https://api.weixin.qq.com/sns/jscode2session?`
        + `appid=${Config.WEIXIN_APPID}&secret=${Config.WEIXIN_SECRET}&`
        + `js_code=${js_code}&grant_type=authorization_code`
}

declare type WeixinSignupReturn = 
    IODataStructure.Response.WeixinSignupReturnAccept | 
    {status: IODataStructure.Response.WeixinCode2SessionError}
/**
 * 功能： 微信的注册和登录（其实是一回事，都是拿着jscode换uuid和client_session_key）
 * 
 * 根据jscode，获取client_session_key和openid
 * 根据openid查找有没有该注册用户
 * 如果没有该注册用户，就在注册该用户
 * 返回该用户的uuid
 */
export async function signupWithWeixin(jscode: string)
    :Promise<WeixinSignupReturn>{
    const rst = await weixinCode2Session(jscode)
    if(is<WeixinCode2SessionAcceptReturn>(rst)){
        const item = await AuthorizationModel.findOne({ wxOpenID: rst.openid })
        let uuid = ""
        if(item){
           // 如果已经有了相同的openid，
            await AuthorizationModel.findOneAndUpdate(
                {wxOpenID: rst.openid}, {wxSessionKey: rst.session_key});
            uuid = item.uuid
        }else{
            // 如果没有现有的openid的话，那么注册一个新的账号
            const user = await User.newUser()
            uuid = user.uuid
            const modelDS: Updator<AuthorizationDS> = {
                uuid: uuid,
                wxOpenID: rst.openid,
                wxSessionKey: rst.session_key
            }
            await new AuthorizationModel(modelDS).save()
        }
        return {
            status: rst.status,
            uuid: uuid,
            client_session_id: encrypt(rst.openid + rst.session_key)
        }
    }else{
        return {status: rst.status}
    }
}

type WeixinCode2SessionAcceptReturn =
     {status: "ACCEPT", session_key: string, openid: string}
type WeixinCode2SessionErrorReturn =  { status: IODataStructure.Response.WeixinCode2SessionError}
// 直接返回了openid和session_key，不应该export
async function weixinCode2Session(js_code: string) : 
        Promise<WeixinCode2SessionAcceptReturn | WeixinCode2SessionErrorReturn>{
    const body = request('GET', sessionTokenUrl(js_code)).getBody('utf-8')
    if(typeof body === 'string'){
        const rtn_json = JSON.parse(body)
        if(rtn_json.openid && rtn_json.session_key){
            switch(rtn_json.errcode){
            case -1: return {status: "ERR_WEIXIN_SERVER"}; break;
            case 40029: return { status: "ERR_INVALID_CODE" }; break;
            case 45011: return { status: "ERR_INVALID_CODE" }; break;
            case undefined: {
                const openid = rtn_json.openid
                const session_key = rtn_json.session_key
                if(openid && session_key)
                    return {
                        status: "ACCEPT", 
                        openid: openid,
                        session_key: session_key
                    }
            }
            break;
            default: return { status: "ERR_WEIXIN_SERVER" }
            }
        }
    }
    return { status: "ERR_WEIXIN_SERVER" }
}

export async function loginWithWeixin(uuid: string, client_session_id: string)
    : Promise<IODataStructure.Response.WeixinLoginStatus>{
    const modelDS = await AuthorizationModel.findOne({uuid: uuid})
    if(modelDS){
        const session_key = modelDS.wxSessionKey
        const openid = modelDS.wxOpenID
        if( session_key && openid && encrypt(openid + session_key) === client_session_id ){
            return "ACCEPT"
        }else{
            return "ERR_INVALID_CLIENT_SESSION_ID" 
        }
    }else{
        return "ERR_INVALID_UUID"
    }
}



//================================微信登录   结束=========================================
