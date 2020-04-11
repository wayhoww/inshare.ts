import * as express from 'express'
import { User, UserModel, Updator, RentingOrRevertingStatus, TryToRentOrRevertResult } from '../lib/User'
import * as auth from '../lib/Authorization'
import { Profile, ProfileModel } from '../lib/Profile'
import { getLogger } from 'log4js'
import * as Config from '../helper/config'
import { deviceManager } from '../helper/instances'
import * as StaticCore from 'express-serve-static-core'

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
    const clientCode = req.query.code

    if (typeof clientCode === 'string') {
        const rst = await auth.signupWithWeixin(clientCode)
        if (rst.status === "ACCEPT" && rst.uuid && rst.client_session_id) {
            const user = new User(rst.uuid)
            updateProfile(req.query, user)
            res.json({
                status: 'accept',
                uuid: user.uuid,
                userid: user.uuid,
                client_session_id: rst.client_session_id
            })
        } else {
            res.json({
                status: 'error',
                errtype: rst.status,
                errmsg: "signp failed"
            })
        }
    } else {
        res.json({
            status: 'error',
            errmsg: 'invalid code'
        })
    }
}

router.get('/signup', weixinSignupHandler)
router.get('/weixin_signup', weixinSignupHandler)
router.get('/login', weixinSignupHandler)

//========================== Weixin Authorization End ===================================

// 需要更详细的错误信息
async function updateProfile(data: any, user: User) {
    let profile: Updator<Profile> = { uuid: user.uuid }

    // 逐个更新信息
    if (typeof data.name === 'string') {
        profile.name = data.name
    }
    if (typeof data.region === 'string') {
        profile.region = data.region
    }
    if (typeof data.phone === 'string') {
        profile.phone = data.phone
    }
    if (typeof data.email === 'string') {
        profile.email = data.email
    }

    // 根据数据库内有没有现有Profile，决定是更新还是添加
    try {
        let _profile = await ProfileModel.findOne({ uuid: user.uuid })
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
    let username = req.query.username
    let password = req.query.password
    if (typeof username === 'string' && typeof password === 'string') {
        //0. 检查用户是否存在  
        if (await auth.existUsername(username) === true) {
            res.json({
                status: 'failed',
                msg: 'username already exists'
            })
            return
        } else {
            // 1. 用户入库
            let user = await User.newUser()
            req.user = user
            // 2. Authorization 入库
            let succ = await auth.createEntryWithUsernameAndPassword(user.uuid, username, password)
            //  如果中途已经有人注册了，或者其他原因导致了注册失败
            if (!succ) {
                await UserModel.findOneAndDelete({ uuid: user.uuid })
                res.json({
                    status: 'failed',
                    msg: 'failed. username already exists?'
                })
                return
            } else {
                // 3. Profile 入库
                await updateProfile(req.query, req.user)
                res.json({
                    status: 'accept',
                    uuid: user.uuid
                })
                return
            }
        }
    } else {
        res.json({
            status: 'failed',
            msg: 'need username and password',
        })
        return
    }

})

//=======================下面都是需要进行身份验证才可以进行的过程=============================
/*['/uuid',
    '/profile',
    '/history',
    '/latest_renting_or_reverting_status',
    '/renting_or_reverting',
    '/rented',
    '/try_to_rent',
    '/try_to_revert']
*/
//检查是否已经登录
//只要通过一种检查方式的检查，那就说明登陆成功了
router.use(
    async (req, res, next) => {
        let uuid: string | undefined | null = undefined
        let potential_errors: string[] = []
        let loginMethod: string = "UNKNOWN"

        if (!uuid) {
            //用户名密码
            let username = req.query.username
            let password = req.query.password
            if (typeof username === 'string' && typeof password === 'string') {
                uuid = await auth.loginWithUsernameAndPassword(username, password)
                if (!uuid) potential_errors.push('wrong password')
                else loginMethod = "username and password"
            }
        }

        if (!uuid) {
            //uuid+sessionkey
            const sessionkey = req.query.client_session_id
            const t_uuid = req.query.uuid || req.query.userid
            if (typeof sessionkey === 'string' && typeof t_uuid === 'string') {
                const rst = await auth.loginWithWeixin(t_uuid, sessionkey);
                if (rst != "ACCEPT") {
                    potential_errors.push(rst)
                } else {
                    uuid = t_uuid
                    loginMethod = "weixin openid"
                }
            }
        }

        if (uuid) {
            req.user = new User(uuid)
            logger.info(`${uuid} passed authorization check (${loginMethod})`)
            next()
            return
        } else {
            res.status(403).json({
                status: 'error',
                msg: 'cannot login',
                potential_errors: potential_errors
            })
        }
        return
    })

router.get('/uuid', async (req, res) => {
    res.json({
        status: 'accept',
        uuid: req.user.uuid
    })
})

router.get('/profile', async (req, res) => {
    let profile = await req.user.profile
    res.json({
        status: 'accepted',
        profile: profile
    })
})

router.use('/profile', async (req, res) => {
    await updateProfile(req.query, req.user)
    res.json({
        status: 'accept',
    })
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
