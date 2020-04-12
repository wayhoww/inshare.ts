import * as express from 'express'
import { User, UserModel, Updator, RentingOrRevertingStatus, TryToRentOrRevertResult } from '../lib/User'
import * as auth from '../lib/Authorization'
import { Profile, ProfileModel } from '../lib/Profile'
import { getLogger } from 'log4js'
import * as Config from '../helper/config'
import { deviceManager } from '../helper/instances'
import * as StaticCore from 'express-serve-static-core'
import { is } from 'typescript-is'
import { IODataStructure } from '../lib/IODataStructure'
import { RentedItemStatus } from '../lib/RentedItem'

const logger = getLogger(Config.WEBAPI_LOGGER_LEVEL)

export const router = express.Router()

declare module 'express-serve-static-core' {
    interface Request {
        user: User
    }
}

declare type Handler = express.RequestHandler<StaticCore.ParamsDictionary, any, any, StaticCore.Query>

//========================== Weixin Authorization Start =================================
const weixinSignupHandler: Handler =
    async (req, res: StaticCore.Response<IODataStructure.Response.WeixinSignup>) => {
        const query = req.query
        let rtn: IODataStructure.Response.WeixinSignup
        if (is<IODataStructure.Request.WeixinSignup>(query)) {
            const rst = await auth.signupWithWeixin(query.jscode)
            if (is<IODataStructure.Response.WeixinSignupReturnAccept>(rst)) {
                const user = new User(rst.uuid)
                query.uuid = user.uuid
                if (is<IODataStructure.User.Profile>(query))
                    updateProfile(query)
                rtn = {
                    status: "ACCEPT",
                    uuid: user.uuid,
                    client_session_id: rst.client_session_id
                }
            } else {
                rtn = {
                    status: rst.status
                }
            }
        } else {
            rtn = {
                status: "ERR_INVALID_QUERY"
            }
        }
        res.json(rtn)
    }

router.post('/signup/weixin', weixinSignupHandler)
router.get('/login/weixin', weixinSignupHandler)

//========================== Weixin Authorization End ===================================

// 需要更详细的错误信息
async function updateProfile(data: IODataStructure.User.Profile): Promise<void> {
    let profile: Updator<Profile> = { uuid: data.uuid }

    // 逐个更新信息
    if (data.name)
        profile.name = data.name

    if (data.region)
        profile.region = data.region

    if (data.phone)
        profile.phone = data.phone

    if (data.email)
        profile.email = data.email


    // 根据数据库内有没有现有Profile，决定是更新还是添加
    try {
        const _profile = await ProfileModel.findOne({ uuid: data.uuid })
        if (_profile) {
            await _profile.updateOne(profile)
        } else {
            await new ProfileModel(profile).save()
        }
    } catch (err) {
        throw (err)
    }
}

/**
 * 注册一个用户需要完成三个部分的操作
 *  1) 用户入库
 *  2) 用户Profile
 *  3) 用户Authorization
 */
router.post('/signup/username',
    async (req, res: StaticCore.Response<IODataStructure.Response.UsernameSignup>) => {
        const query = req.body
        let rtn: IODataStructure.Response.UsernameSignup
        if (is<IODataStructure.Request.UsernameSignup>(query)) {
            //0. 检查用户是否存在  
            if (await auth.existUsername(query.username) === true) {
                rtn = { status: "ERR_USERNAME_ALREADY_EXIST" }
            } else {
                // 1. 用户入库
                let user = await User.newUser()
                req.user = user
                // 2. Authorization 入库
                let succ =
                    await auth.createEntryWithUsernameAndPassword
                        (user.uuid, query.username, query.password)
                //  如果中途已经有人注册了，或者其他原因导致了注册失败
                if (!succ) {
                    await UserModel.findOneAndDelete({ uuid: user.uuid })
                    rtn = { status: "ERR_USERNAME_ALREADY_EXIST" }
                } else {
                    // 3. Profile 入库
                    const nquery: IODataStructure.Request.UsernameSignup & {uuid?: string} = query;
                    nquery.uuid = user.uuid
                    if (is<IODataStructure.User.Profile>(nquery))
                        await updateProfile(nquery)
                    rtn = {
                        status: "ACCEPT",
                        uuid: user.uuid
                    }
                }
            }
        } else {
            rtn = { status: "ERR_INVALID_QUERY" }
        }
        res.json(rtn)
    })

//=======================下面都是需要进行身份验证才可以进行的过程=============================

export type LoginMethod = "UNKNOWN" | "WEIXIN" | "USERNAME"
//检查是否已经登录
//只要通过一种检查方式的检查，那就说明登陆成功了
router.use(
    async (req, res: StaticCore.Response<IODataStructure.Response.LoginFailed>, next) => {
        let uuid: string | undefined | null = undefined
        let potentialErrors: IODataStructure.Response.LoginError[] = []
        let loginMethod: LoginMethod = "UNKNOWN"

        const query = req.query

        if (!uuid && is<IODataStructure.Request.UsernameAuthorization>(query)) {
            //用户名密码
            uuid = await auth.loginWithUsernameAndPassword(query.username, query.password)
            if (!uuid) potentialErrors.push("ERR_WRONG_PASSWORD")
            else loginMethod = "USERNAME"
        }

        if (!uuid && is<IODataStructure.Request.WeixinAuthorization>(query)) {
            const rst = await auth.loginWithWeixin(query.uuid, query.uuid);
            if (rst != "ACCEPT") {
                potentialErrors.push(rst)
            } else {
                uuid = query.uuid
                loginMethod = "WEIXIN"
            }
        }

        if (uuid) {
            req.user = new User(uuid)
            logger.info(`${uuid} passed authorization check (${loginMethod})`)
            next()
            return
        } else {
            const errrtn: IODataStructure.Response.LoginFailed = {
                status: "ERR_LOGIN_FAILED",
                potentialErrors: potentialErrors
            }
            res.status(403).json(errrtn)
        }
        return
    })

router.get('/uuid', async (req,
    res: StaticCore.Response<IODataStructure.Response.UUID>) => {
    const rtn: IODataStructure.Response.UUID = {
        status: "ACCEPT",
        uuid: req.user.uuid
    }
    res.json(rtn)
})

router.get('/profile', async (req,
    res: StaticCore.Response<IODataStructure.Response.Profile>) => {
    let profile = await req.user.profile
    const rtn: IODataStructure.Response.Profile = {
        status: "ACCEPT",
        profile: profile
    }
    res.json(rtn)
})

router.post('/profile', async (req,
    res: StaticCore.Response<IODataStructure.Response.PostProfile>) => {
    const query = req.query
    query.uuid = req.user.uuid
    let rtn: IODataStructure.Response.PostProfile
    if (is<IODataStructure.User.Profile>(query)) {
        await updateProfile(query)
        rtn = { status: "ACCEPT", }
    } else {
        rtn = { status: "ERR_INVALID_QUERY" }
    }
    res.json(rtn)
})

router.get('/latest_renting_or_reverting_status', async (req,
    res: StaticCore.Response<IODataStructure.Response.LatestRentingOrRevertingStatus>) => {
    const rst = await req.user.latestRentingOrRevertingResult
    let stat: IODataStructure.Response.RentingOrRevertingStatus
    switch (rst) {
        case RentingOrRevertingStatus.UNSTARTED: stat = "UNSTARTED"; break;
        case RentingOrRevertingStatus.FAILED: stat = "FAILED"; break;
        case RentingOrRevertingStatus.WAITING: stat = "WAITING"; break;
        case RentingOrRevertingStatus.SUCCEEDED: stat = "SUCCEEDED"; break;
    }
    res.json({
        status: "ACCEPT",
        latestRentingOrRevertingStatus: stat
    })
})


router.get('/renting_or_reverting',
    async (req, res: StaticCore.Response<IODataStructure.Response.RentingOrReverting>) => {
        res.json({
            status: "ACCEPT",
            rentingOrReverting: await req.user.rentingOrReverting
        })
    })

const rentingHandler: Handler =
    async (req, res: StaticCore.Response<IODataStructure.Response.RentingItems>) => {
        const items: IODataStructure.Device.RentingItem[] = []
        for (let item of (await req.user.rented).values()) {
            items.push({
                uuid: item.uuid,
                rentedTime: item.rentedTime,
                typeID: item.typeID,
                typeName: "TODO",
                fromID: item.fromID,
                status: "RENTING"
            })
        }

        res.json({
            status: "ACCEPT",
            items: items
        })
    }

router.get('/renting', rentingHandler)

router.get('/history', async (req,
    res: StaticCore.Response<IODataStructure.Response.AllRentedItems>) => {
    let skip: number = NaN
    let limit: number = NaN
    if (typeof req.query.skip === 'string') skip = parseInt(req.query.skip)
    if (typeof req.query.limit === 'string') limit = parseInt(req.query.limit)
    if (skip === NaN) skip = 0
    if (limit === NaN) limit = 1e10

    let data = (await req.user.getHistory(skip, limit)).values()
    let items: IODataStructure.Device.AllRentedItem[] = []
    for (let item of data) {
        let status: IODataStructure.Device.RentedItemStatus
        switch(item.status){
            case RentedItemStatus.RENTED: status = "RENTING"
            case RentedItemStatus.REVERTED: status = "UNRENTED"
            case RentedItemStatus.UNRENTED: status = "REVERTED"
        }
        items.push({
            uuid: item.uuid,
            typeID: item.typeID,
            typeName: "TODO",
            fromID: item.fromID,
            rentedTime: item.rentedTime,
            status: status,
            revertedTime: item.revertedTime,
            revertToID: item.revertToID
        })
    }
    res.json({
        status: "ACCEPT",
        items: items
    })
})

router.get('/try_to_rent', 
        async (req, res: StaticCore.Response<IODataStructure.Response.TryToRent>) => {
    const query = req.query
    if (is<IODataStructure.Request.TryToRent>(query)) {
        let type = parseInt(query.typeID)
        let device = deviceManager.getInstance(query.deviceID)
        if (!device) {
            res.json({status: "ERR_NO_DEVICE"})
            return
        }
        let rst = await req.user.tryToRent(device, type)
        switch(rst){
            case TryToRentOrRevertResult.ACCEPTED:
                res.json({status: "ACCEPT"}); break;
            case TryToRentOrRevertResult.DOING:
                res.json({status: "ERR_BUSY"}); break;
            case TryToRentOrRevertResult.NO_PERMISSION:
                res.json({status: "ERR_NO_PERMISSION"})
        }
    }else{
        res.json({status: "ERR_INVALID_QUERY"})
    }
})



router.get('/try_to_revert', 
        async (req, res: StaticCore.Response<IODataStructure.Response.TryToRevert>) => {
    const query = req.query
    if (is<IODataStructure.Request.TryToRevert>(query)) {
        let device = deviceManager.getInstance(query.deviceID)
        if (!device) {
            res.json({status: "ERR_NO_DEVICE"})
            return
        }
        let item = (await req.user.rented).get(query.itemUUID)

        let rst: TryToRentOrRevertResult = await req.user.tryToRevert(device, query.itemUUID)
        switch(rst){
            case TryToRentOrRevertResult.ACCEPTED:
                res.json({status: "ACCEPT"}); break;
            case TryToRentOrRevertResult.DOING:
                res.json({status: "ERR_BUSY"}); break;
            case TryToRentOrRevertResult.NO_PERMISSION:
                res.json({status: "ERR_NO_PERMISSION"})
        }
    } else {
        res.json({status: "ERR_INVALID_QUERY"})
    }
})
