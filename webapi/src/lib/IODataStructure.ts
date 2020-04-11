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
        export declare type Captcha = string

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
        declare type Status = "ACCEPT"

        /** /device/list返回的数据 */
        export interface DeviceList {
            status: Status,
            devices: IODataStructure.Device.Device[]
        }

    }

    /** 定义接受请求的时候JSON数据的格式 */
    export namespace Request{

        export interface WeixinSignupQuery {
            jscode: string
        }
    }
}

