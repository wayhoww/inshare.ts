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
            captchas: Captcha[]
            doors: Door[]
            instruments: InstrumentType[]
        }
    }

    export namespace User {

        /** 用户个人信息，不包含用户的密码等信息，事实上是无关紧要的 */
        export interface Profile{
            uuid: string,           // 唯一用户ID, 由UUID v1生成
            name?: string,          // 用户名字
            region?: string,        // 用户地区
            phone?: string,         // 用户电话号码
            email?: string          // 用户电子邮件地址（不用于身份验证！）
        }        
        
    }

    /** 定义回复请求的时候JSON数据的格式 */
    export namespace Response{
        export type UnacceptedStatus = WeixinSignupError
        export type FullStatus<T> = T | "ACCEPT"
        export type InvalidQueryError = "ERR_INVALID_QUERY"

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

        export type UUID = {
            status: "ACCEPT",
            uuid: string
        }
        export type Profile = {
            status: "ACCEPT",
            profile: IODataStructure.User.Profile
        }        
        export type PostProfile = {
            status: "ACCEPT" | InvalidQueryError
        }

    }

    /** 定义接受请求的时候JSON数据的格式 */
    export namespace Request{

        export interface WeixinSignupQuery {
            jscode: string
        }

        export type WeixinLoginQuery = {
            uuid: string,
            client_session_id: string
        }

        export interface UsernameSignupQuery {
            [x: string]: string;
            username: string,
            password: string
        }
    }
}

