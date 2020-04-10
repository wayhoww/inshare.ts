import { model, Schema, Document } from 'mongoose'
import {createHmac} from 'crypto'
import { getLogger, Logger } from 'log4js';
import * as Config from '../../../config/config'

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
