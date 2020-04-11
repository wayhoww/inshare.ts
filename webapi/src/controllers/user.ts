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

const logger = getLogger(Config.WEBAPI_LOGGER_LEVEL)

export const router = express.Router()

declare module 'express-serve-static-core' {
    interface Request {
        user: User
    }
}

declare type Handler = express.RequestHandler<StaticCore.ParamsDictionary, any, any, StaticCore.Query>

//========================== Weixin Authorization Start =================================
const weixinSignupHandler: Handler = async (req, res) => {
    const query = req.query
    let rtn: IODataStructure.Response.WeixinSignup
    if (is<IODataStructure.Request.WeixinSignupQuery>(query)) {
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

router.get('/signup', weixinSignupHandler)
router.get('/weixin_signup', weixinSignupHandler)
router.get('/login', weixinSignupHandler)

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
router.use('/signup_username_password', async (req, res) => {
    const query = req.body
    let rtn: IODataStructure.Response.UsernameSignup
    if (is<IODataStructure.Request.UsernameSignupQuery>(query)) {
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
                query.uuid = user.uuid
                if (is<IODataStructure.User.Profile>(query))
                    await updateProfile(query)
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
    async (req, res, next) => {
        let uuid: string | undefined | null = undefined
        let potentialErrors: IODataStructure.Response.LoginError[] = []
        let loginMethod: LoginMethod = "UNKNOWN"

        const query = req.query

        if (!uuid && is<IODataStructure.Request.UsernameSignupQuery>(query)) {
            //用户名密码
            uuid = await auth.loginWithUsernameAndPassword(query.username, query.password)
            if (!uuid) potentialErrors.push("ERR_WRONG_PASSWORD")
            else loginMethod = "USERNAME"
        }

        if (!uuid && is<IODataStructure.Request.WeixinLoginQuery>(query)) {
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

router.get('/uuid', async (req, res) => {
    const rtn: IODataStructure.Response.UUID = {
        status: "ACCEPT",
        uuid: req.user.uuid
    }
    res.json(rtn)
})

router.get('/profile', async (req, res) => {
    let profile = await req.user.profile
    const rtn: IODataStructure.Response.Profile = {
        status: "ACCEPT",
        profile: profile
    }
})

router.post('/profile', async (req, res) => {
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

router.get('/latest_renting_or_reverting_status', async (req, res) => {
    res.json({
        status: 'accept',
        latest_renting_or_reverting_status: await req.user.latestRentingOrRevertingResult
    })
})


router.get('/renting_or_reverting', async (req, res) => {
    res.json({
        status: 'accept',
        renting_or_reverting: await req.user.rentingOrReverting
    })
})

const rentedHandler: Handler = async (req, res) => {
    res.json({
        status: 'accept',
        rented: Array.from(await (await req.user.rented).values())
    })
}

router.get('/rented', rentedHandler)
router.get('/status', rentedHandler)

router.get('/history', async (req, res) => {
    if (typeof req.query.skip === 'string' && typeof req.query.limit === 'string') {
        let skip = parseInt(req.query.skip)
        let limit = parseInt(req.query.limit)
        if (skip === NaN) skip = 0
        if (limit === NaN) limit = 1e10
        res.json({
            status: 'accept',
            history: Array.from((await req.user.getHistory(skip, limit)).values())
        })
    } else {
        res.json({
            status: 'error',
            error: 'invalid parameters'
        })
    }
})

router.use('/try_to_rent', async (req, res) => {
    let deviceID = req.query.device_id
    let typeID = req.query.type_id
    logger.debug(req.query)
    if (typeof deviceID === 'string' && typeof typeID === 'string') {
        let type = parseInt(typeID)
        if (typeof deviceID === 'string' && typeof typeID === 'string' && type !== NaN) {
            let device = deviceManager.getInstance(deviceID)
            if (!device) {
                res.json({
                    status: 'error',
                    msg: 'no such device'
                })
                return
            }
            let rst = await req.user.tryToRent(device, type)
            if (rst === TryToRentOrRevertResult.ACCEPTED) {
                res.json({
                    status: 'accept'
                })
            } else {
                res.json({
                    status: 'error',
                    msg: 'see `reason`',
                    reason: rst
                })
            }
        } else {
            res.json({
                status: 'error',
                msg: 'invalid device id or type id'
            })
        }
    } else {
        res.json({
            status: 'error',
            msg: 'invalid parameters'
        })
    }

})



router.use('/try_to_revert', async (req, res) => {
    let deviceID = req.query.device_id
    let itemUUID = req.query.rent_item_uuid
    if (typeof deviceID === 'string' && typeof itemUUID === 'string') {
        let device = deviceManager.getInstance(deviceID)
        if (!device) {
            res.json({
                status: 'error',
                msg: 'no such device'
            })
            return
        }
        let item = (await req.user.rented).get(itemUUID)

        let rst: TryToRentOrRevertResult = await req.user.tryToRevert(device, itemUUID)
        switch (rst) {
            case TryToRentOrRevertResult.ACCEPTED:
                res.json({
                    status: 'accept'
                });
                break;
            case TryToRentOrRevertResult.DOING:
                res.json({
                    status: 'error',
                    msg: 'busy on other renting or reverting process'
                })
            case TryToRentOrRevertResult.IMPOSSIBLE:
                res.json({
                    status: 'error',
                    msg: 'impossible to revert on this device'
                })
        }

    } else {
        res.json({
            status: 'error',
            msg: 'invalid device id or type id'
        })
    }

})
