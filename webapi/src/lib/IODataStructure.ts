/**
 * 定义这个文件中的类型，是为了让所有的IO接受静态检查，让所有的请求的输入先接受运行时检查
 */

export namespace IODataStructure {

    /** 和设备信息有关的数据结构 */
    export namespace Device {
        /** 设备经纬度，x表示经度，y表示纬度，正数表示东经和北纬，负数表示西经和南纬 */
        export interface Location {
            x: number,
            y: number
        }

        /** 器材种类 */
        export interface InstrumentType {
            typeID: number,    // 器材ID
            typeName: string,  // 器材名称
            total: number,     // 某设备上运行存放该种器材的最大容量
            remained: number   // 某设备上该器材的剩余数量
        }

        /** 验证码 */
        export type Captcha = string

        /** 设备箱门 */
        export interface Door {
            opened: boolean // 箱门是否开着
        }

        /** 一个IoT设备的抽象 */
        export interface Device {
            deviceID: string,
            location: Location,
            workingTime: number,    // IoT设备返回的以秒计算的工作时间，可能是个无效数据
            lastUpdate: Date,       // 上次更新IoT设备信息的时间，可以用来判断IoT设备是不是离线了
            captchas: Captcha[]     // 验证码数组，这个验证码会显示到IoT设备上
            doors: Door[]           // 设备的门的数据，似乎没什么用
            instruments: InstrumentType[]
        }

        //                             正在借用      已经归还     没借用成功
        export type RentedItemStatus = "RENTING" | "REVERTED" | "UNRENTED"

        /** 正在借用着，还没有归还 */
        export interface RentingItem{
            uuid: string,       // 这次借用记录的uuid
            fromID: string,     // 从哪个设备借的
            typeID: number,     // 借的是什么类型（ID）
            typeName: string    // 借的是什么类型（名称）
            rentedTime: Date,   // 什么时候借的
            status: "RENTING"   
        }

        /** 有可能正在借用，有可能已经归还，也有可能没有借成功 */
        export interface AllRentedItem{
            uuid: string,            // 这次借用记录的uuid
            fromID: string,          // 从哪个设备借的
            revertToID?: string,     // 归还到了哪个设备
            typeID: number,          // 借的是什么类型（ID）
            typeName: string         // 借的是什么类型（名称）
            rentedTime: Date,        // 什么时候借的
            revertedTime?: Date,     // 什么时候归还的
            status: RentedItemStatus
        }
    }

    export namespace User {

        /** 用户个人信息，不包含用户的密码等信息，事实上是无关紧要的 */
        export interface Profile {
            uuid: string,           // 唯一用户ID, 由UUID v1生成
            name?: string,          // 用户名字
            region?: string,        // 用户地区
            phone?: string,         // 用户电话号码
            email?: string          // 用户电子邮件地址（不用于身份验证！）
        }
    }

    /** 定义回复请求的时候JSON数据的格式 */
    export namespace Response {
        /** 错误：请求的时候提交的参数不对 */
        export type InvalidQueryError = "ERR_INVALID_QUERY"

        /** GET /device/list */
        export interface DeviceList {
            status: "ACCEPT",                           
            devices: IODataStructure.Device.Device[]
        }

        //========================微信注册登录 开始===================================

        /** 调用微信API时候，微信返回的错误 */
        export type WeixinCode2SessionError =
        //    微信服务器挂了         提交的jscode不对    这个微信号的登录频率太高了
            "ERR_WEIXIN_SERVER" | "ERR_INVALID_CODE" | "ERR_FREQUENCY_EXCEED";
        
        export type WeixinSignupError = WeixinCode2SessionError | InvalidQueryError

        export interface WeixinSignupReturnAccept {
            status: "ACCEPT",
                                        // 小程序可以提交下面连个数据来验证信息
            uuid: string,               // 用户uuid
            client_session_id: string   // client_session_id
        }

        /**
         * 目前微信登录和注册的逻辑其实是一样的（把一个新用户的jscode
         * 提交到 /user/login，也会注册这个用户），为了让语义明确一些，才
         * 提供了两个不同的API。
         * 
         * GET /user/login/weixin
         * GET /user/signup/weixin
         * 
         * 需要提交 @interface Request.WeixinSignup
         */
        export type WeixinSignup = WeixinSignupReturnAccept
            | { status: WeixinSignupError }

        
        //========================微信注册登录 结束===================================

        //========================用户名密码注册登录 开始===================================
        
        //                                    已经存在同名用户
        export type UsernameSignupError = "ERR_USERNAME_ALREADY_EXIST" | InvalidQueryError
        export interface UsernameSignupReturnAccept {
            status: "ACCEPT",
            uuid: string,
        }

        /**
         *  POST /user/signup/username
         *  需要提交 @interface Request.UsernameSignup
         **/
        export type UsernameSignup = UsernameSignupReturnAccept
            | { status: UsernameSignupError }
        
        //========================用户名密码注册登录 结束===================================
        
        //========================权限鉴定 开始===================================
        /** 
         * 在获取个人信息和进行借用之前，都会进行权限鉴定，需要提交相应的数据
         * 需要提交 @type Request.Authorization 
         */

        export type WeixinLoginStatus = "ACCEPT" | WeixinLoginError
        // 各种登录错误
        export type WeixinLoginError = | "ERR_INVALID_CLIENT_SESSION_ID" | "ERR_INVALID_UUID"
        export type LoginError = "ERR_WRONG_PASSWORD" | WeixinLoginError

        // 任何一个需要登录的操作都可能因为登陆失败而返回这个（代码：403）
        export type LoginFailed = {
            status: "ERR_LOGIN_FAILED",
            potentialErrors: LoginError[] // 可能的登录错误原因
        }
        //========================权限鉴定 结束===================================

        //========================用户名个人信息 开始===================================      
        /** 获取用户uuid
         *  GET /user/uuid
         *  需要提交 @type Request.Authorization 
         **/  
        export interface UUID {
            status: "ACCEPT",
            uuid: string
        }
        /** 获取用户个人信息 
         * GET /user/profile
         *  需要提交 @type Request.Authorization  
         **/
        export interface Profile {
            status: "ACCEPT",
            profile: IODataStructure.User.Profile
        }
        /** 修改用户个人信息
         * POST /user/profile 
         * 需要提交 @type Request.Authorization  
         **/
        export interface PostProfile {
            status: "ACCEPT" | InvalidQueryError
        }
        //                                      还没借过     等待设备响应    失败       成功
        export type RentingOrRevertingStatus = "UNSTARTED" | "WAITING" | "FAILED" | "SUCCEEDED"
        /** GET 
         * /user/latest_renting_or_reverting_status 
         * 需要提交 @type Request.Authorization 
         * */
        export interface LatestRentingOrRevertingStatus {
            status: "ACCEPT",
            latestRentingOrRevertingStatus: RentingOrRevertingStatus
        }
        /** 是不是正在借用或者正在归还某个器材
         * GET /user/renting_or_reverting 
         * 需要提交 @type Request.Authorization  
         **/
        export interface RentingOrReverting {
            status: "ACCEPT",
            rentingOrReverting: boolean
        }
        /** 正在借用，还没归还的器材。还没成功借到的器材不会返回 
         *  GET /user/renting 
         *  需要提交 @type Request.Authorization 
         * */
        export interface RentingItems {
            status: "ACCEPT",
            items: Device.RentingItem[]
        }
        /** 所有历史和当前借用信息
         *  GET /user/history 
         *  需要提交 1) @type Request.Authorization 和
         *          2) @interface Request.AllRentedItem
         **/
        export interface AllRentedItems {
            status: "ACCEPT",
            items: Device.AllRentedItem[]
        }
        
        //========================用户名个人信息 结束=================================== 
        
        //========================租借与归还 开始===================================                                        
        export type TryToRentOrRevertError =  "ERR_NO_DEVICE" |     // IoT设备不存在

                                              "ERR_NO_PERMISSION" | // 没有权限借用
                                                                    //（已经达到最大允许借用的数量
                                                                    //（这个数量也可能是0））

                                              "ERR_BUSY"            // 正在借用或归还，暂时不能再借用
        
        /** 借用请求
         * GET /user/try_to_rent 
         * 需要提交 1) @type Request.Authorization 和 
         *         2) @interface Request.TryToRent
         **/
        export interface TryToRent {
            status: "ACCEPT" | TryToRentOrRevertError | InvalidQueryError
        }

        /** 归还请求
         *  GET /user/try_to_revert
         *  需要提交 1) @type Request.Authorization 和 
         *          2) @interface Request.TryToRevert 
         **/
        export type TryToRevert = TryToRent

        //========================租借与归还 结束=================================== 
    }

    /** 定义接受请求的时候JSON数据的格式 */
    export namespace Request {

        export type Authorization = WeixinAuthorization | UsernameAuthorization

        export interface WeixinSignup {
            jscode: string          // wx.login 函数返回的code
        }

        export type WeixinAuthorization = {
            uuid: string,               // 用户uuid
            client_session_id: string   // client_session_id
        }

        export interface UsernameSignup {
            username: string,           // 用户名
            password: string            // 密码。反正有SSL，用明文传输应该没问题
        }

        export type UsernameAuthorization = UsernameSignup

        /** HTTP 的 Query 好像也不支持特殊的数字类型 */
        /** 十进制数字字符串形式 */
        export interface AllRentedItem {
            skip?: string,      // 跳过前面skip条数据
            limit?: string      // 最多获取limit条数据
        }

        export interface TryToRent{
            deviceID: string,
            typeID: string /** 十进制数字字符串软件 */
        }

        export interface TryToRevert{
            deviceID: string,
            itemUUID: string    // 借取条目的UUID
        }
    }
}

