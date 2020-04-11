import { model, Schema, Document } from 'mongoose'
import {createHmac} from 'crypto'
import { getLogger, Logger } from 'log4js';
import * as Config from '../helper/config'
import request from 'sync-request'
import { Updator } from './User';

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

export type WeixinSignupError = "ACCEPT" | "ERR_WEIXIN_SERVER" | "ERR_INVALID_CODE" | "ERR_FREQUENCY_EXCEED";
export async function signupWithWeixin(uuid: string, js_code: string) : 
        Promise<{status: WeixinSignupError, client_session_key?: string}>{
    const body = request('GET', sessionTokenUrl(js_code)).body
    if(typeof body === 'string'){
        const rtn_json = JSON.parse(body)
        if(rtn_json.errcode && rtn_json.openid && rtn_json.session_key){
            logger.debug('看一下errcode是什么类型的：' + typeof rtn_json.errcode)
            switch(rtn_json.errcode){
            case -1: return {status: "ERR_WEIXIN_SERVER"}; break;
            case 40029: return { status: "ERR_INVALID_CODE" }; break;
            case 45011: return { status: "ERR_INVALID_CODE" }; break;
            case 0: {
                const openid = rtn_json.openid
                const session_key = rtn_json.session_key
                const item =  await AuthorizationModel.findOne({wxOpenID: openid})
                // 如果已经有了相同的openid，则更新session_key
                if(item){
                    await AuthorizationModel.findOneAndUpdate(
                        {wxOpenID: openid}, {wxSessionKey: session_key});
                }else{
                    const modelDS: Updator<AuthorizationDS> = {
                        uuid: uuid,
                        wxOpenID: openid,
                        wxSessionKey: session_key
                    }
                    await new AuthorizationModel(modelDS).save()
                }
                return {status: "ACCEPT", client_session_key: encrypt(session_key)}
            }
            break;
            default: return { status: "ERR_WEIXIN_SERVER" }
            }
        }
    }
    return { status: "ERR_WEIXIN_SERVER" }
}

export type WeixinLoginError = "ACCEPT" | "INVALID_CLIENT_SESSION_KEY" | "INVALID_OPENID"
export async function loginWithWeixin(openid: string, client_session_key: string)
    : Promise<WeixinLoginError>{
    const modelDS = await AuthorizationModel.findOne({wxOpenID: openid})
    if(modelDS){
        const session_key = modelDS.wxSessionKey
        if( encrypt(session_key) === client_session_key ){
            return "ACCEPT"
        }else{
            return "INVALID_CLIENT_SESSION_KEY"
        }
    }else{
        return "INVALID_OPENID"
    }
}



//================================微信登录   结束=========================================
