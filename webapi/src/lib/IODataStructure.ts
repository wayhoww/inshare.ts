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

        /**
         * RENTI
         */
        export type RentedItemStatus = "RENTING" | "REVERTED" | "UNRENTED"

        export interface RentingItem{
            uuid: string,       
            fromID: string,     // 从哪个设备借的
            typeID: number,     //
            typeName: string    //
            rentedTime: Date,   //
            status: "RENTING"
        }

        export interface AllRentedItem{
            uuid: string,
            fromID: string,
            revertToID?: string,
            typeID: number,
            rentedTime: Date,
            revertedTime?: Date,
            status: RentedItemStatus
            typeName: string
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

        /** 借用设备信息 */
        export interface RentedItem {
            uuid: string,
            fromID: string,
            typeID: number,
            typeName: number,
            rentedTime: Date,
            reverted: false /** 借用失败要入库嘛？ */
        }

        export type RevertedItem = RentedItem & {
            reverted: true
            revertToID: string,
            revertedTime: Date,
        }
    }

    /** 定义回复请求的时候JSON数据的格式 */
    export namespace Response {
        export type UnacceptedStatus = WeixinSignupError
        export type FullStatus<T> = T | "ACCEPT"
        export type InvalidQueryError = "ERR_INVALID_QUERY"


        export type DataStructures = DeviceList | WeixinSignup | UsernameSignup
            | LoginFailed | UUID | Profile | PostProfile | LatestRentingOrRevertingStatus

        /** /device/list返回的数据 */
        export interface DeviceList {
            status: "ACCEPT",
            devices: IODataStructure.Device.Device[]
        }

        // 微信注册的返回
        export type WeixinCode2SessionError =
            "ERR_WEIXIN_SERVER" | "ERR_INVALID_CODE" | "ERR_FREQUENCY_EXCEED";
        export type WeixinSignupError = WeixinCode2SessionError | InvalidQueryError
        //  /user/login /user/signup
        export interface WeixinSignupReturnAccept {
            status: "ACCEPT",
            uuid: string,
            client_session_id: string
        }
        export type WeixinSignup = WeixinSignupReturnAccept
            | { status: WeixinSignupError }


        // 用户名注册的返回
        export type UsernameSignupError = "ERR_USERNAME_ALREADY_EXIST" | InvalidQueryError
        export interface UsernameSignupReturnAccept {
            status: "ACCEPT",
            uuid: string,
        }
        export type UsernameSignup = UsernameSignupReturnAccept
            | { status: UsernameSignupError }


        // 登录错误
        export type WeixinLoginStatus = "ACCEPT" | WeixinLoginError
        export type WeixinLoginError = | "ERR_INVALID_CLIENT_SESSION_ID" | "ERR_INVALID_UUID"
        export type LoginError = "ERR_WRONG_PASSWORD" | WeixinLoginError
        // 任何一个需要登录的操作都可能因为登陆失败而返回这个
        export type LoginFailed = {
            status: "ERR_LOGIN_FAILED",
            potentialErrors: LoginError[]
        }

        export interface UUID {
            status: "ACCEPT",
            uuid: string
        }
        export interface Profile {
            status: "ACCEPT",
            profile: IODataStructure.User.Profile
        }
        export interface PostProfile {
            status: "ACCEPT" | InvalidQueryError
        }
        export type RentingOrRevertingStatus = "UNSTARTED" | "WAITING" | "FAILED" | "SUCCEEDED"
        export interface LatestRentingOrRevertingStatus {
            status: "ACCEPT",
            latestRentingOrRevertingStatus: RentingOrRevertingStatus
        }
        export interface RentingOrReverting {
            status: "ACCEPT",
            rentingOrReverting: boolean
        }
        export interface RentingItems {
            status: "ACCEPT",
            items: Device.RentingItem[]
        }
        export interface AllRentedItems {
            status: "ACCEPT",
            items: Device.AllRentedItem[]
        }

        export type TryToRentOrRevertError =  "ERR_NO_DEVICE" | "ERR_NO_PERMISSION" | "ERR_BUSY"
        export interface TryToRent {
            status: "ACCEPT" | TryToRentOrRevertError | InvalidQueryError
        }
        export type TryToRevert = TryToRent



    }

    /** 定义接受请求的时候JSON数据的格式 */
    export namespace Request {

        export interface WeixinSignupQuery {
            jscode: string
        }

        export type WeixinLoginQuery = {
            uuid: string,
            client_session_id: string
        }

        export interface UsernameSignupQuery {
            username: string,
            password: string
        }

        /** HTTP 的 Query 好像也不支持特殊的数字类型 */
        /** 十进制数字字符串形式 */
        export interface AllRentedItem {
            skip?: string,
            limit?: string
        }

        export interface TryToRent{
            deviceID: string,
            typeID: string /** 十进制数字字符串软件 */
        }

        export interface TryToRevert{
            deviceID: string,
            itemUUID: string
        }
    }
}

