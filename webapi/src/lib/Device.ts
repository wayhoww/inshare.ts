import { connect, MqttClient, IClientOptions } from 'mqtt'
import { assert } from 'console'
import { getLogger } from 'log4js'
import * as Config from '../helper/config'

const logger = getLogger(Config.WEBAPI_LOGGER_LEVEL)

/**
 * 设备管理器类，用于管理某一个路径下所有的device
 */
export class DeviceManager {
    devices: Map<string, Device>
    mqttClient: MqttClient

    constructor(mqttUrl: string, public prefix: string, private captchaDuration: number = 10000) {
        this.devices = new Map()

        let option: IClientOptions = {
            will: {
                qos: 2,
                topic: prefix, /* 这好像也没什么用 */
                payload: "", /* 为什么必须要指定这个 */
                retain: true,
            }
        }
        let _this = this
        this.mqttClient = connect(mqttUrl, option)
        this.mqttClient.on('connect', () => {
            logger.info('MQTT is connected')
            // IoT 发送信息的topic
            this.mqttClient.subscribe({ [prefix + '/client/+']: { qos: 2 } }, () => {
                // 主动要求 IoT 设备发送自己的信息
                _this.intuitivelyFetch()
            })
        })
        this.mqttClient.on('message', (topic, msg) => { _this.messageHandler(topic, msg) })
    }

    intuitivelyFetch() {
        for (let command of [0xA2, 0xA3, 0xA4, 0xA5]) {
            // 发送消息，希望IoT设备马上返回对应信息
            this.mqttClient.publish(this.prefix + '/server', Buffer.from([command]))
        }
    }

    messageHandler(topic: string, payload: Buffer) {
        let device_id = topic.substring(topic.lastIndexOf('/') + 1)
        let device_ = this.devices.get(device_id)
        let _this = this
        let device: Device = device_ instanceof Device ? device_ :
            new Device(device_id, (msg: Buffer) => {
                _this.mqttClient.publish(_this.prefix + '/server/' + device_id, msg)
            }, this.captchaDuration)
        if (!device_) {
            this.devices.set(device_id, device)
            logger.info(`Found device ${device_id}`)
        }
        device.messageHandler(payload)       
        if (payload[0] === 0x00) {
            this.devices.delete(device_id)
            logger.info(`${device_id} intuitively exited`)
        }
    }

    getInstance(uuid: string): Device | undefined {
        return this.devices.get(uuid)
    }
}

export class Door {
    opened: boolean
}

export class Device {
    location: { x: number, y: number }
    workingTime: number
    doors: Door[]
    instruments: Map<number, { total: number, remained: number }>
    lastUpdate: Date
    token: number
    interactions: Map<Number, Interaction>
    captchas: string[] = []
    private captchaInterval: number

    startImmediately(fun: Function, duration: number) {
        fun()
        return setInterval(fun, duration);
    }

    constructor(public id: string, public publish: Function, captchaDuration: number = 10000) {
        function numberOfLength(x: number, n: number) {
            let str = x.toString()
            const nn = str.length
            for (let i = 0; i < n - nn; i++) {
                str = '0'.concat(str)
            }
            return str
        }

        this.token = 0
        this.interactions = new Map()
        this.instruments = new Map()
        this.captchaInterval = this.startImmediately(() => {
            let buffer = new Buffer(5);
            buffer.writeUInt8(0xC1);
            const captcha = Math.floor(Math.random() * 1000) % 999
            if(this.captchas.length >= 2){
                this.captchas.splice(0, 1)
            }
            const captchastr = numberOfLength(captcha, 3)
            this.captchas.push(captchastr)
            buffer.write(captchastr, 1);
            this.publish(buffer)
        }, captchaDuration)
    }

    private rentOrRevert(behavior: string, type: number) {
        assert(type < 256, "instrument id greater than 255")
        let token = this.token
        this.token = (this.token + 1) % 256

        let firstByte = behavior === 'rent' ? 0xB1 : 0xB2
        logger.info(`Sendind 0x${firstByte.toString(16)} to IoT device ${this.id}`)
        this.publish(Buffer.from([firstByte, type, token]))

        let _this = this
        function deleteAndCall(token: Number, fun: Function) {
            logger.debug('deleteAndCall')
            try{
                if (_this.interactions.has(token)) _this.interactions.delete(token)
                else assert(false, 'invalid token from IoT device: ' + token)
            }catch(err){
                logger.error(err)
            }
            fun()
        }
        return new Promise((resolve, reject) => {
            this.interactions.set(token, {
                iotToken: token,
                onSuccess: () => {
                    logger.debug('onSuccess')
                    deleteAndCall(token, resolve)
                },
                onFailure: () =>{
                    logger.debug('onFaliure')
                    deleteAndCall(token, reject)
                }
            })
        })
    }

    rent(type: number) {
        let ins = this.instruments.get(type)
        // 数量不够，直接拒绝 或者 没有该类型
        if (ins === undefined || ins.remained == 0){
            logger.debug(`Refused: ins=${ins}`)
            return new Promise((res, rej) => { rej() })
        }
        return this.rentOrRevert('rent', type)
    }

    revert(type: number) {
        let ins = this.instruments.get(type)
        // 数量已满，直接拒绝
        if (ins === undefined || ins.remained == ins.total)
            return new Promise((res, rej) => { rej() })
        return this.rentOrRevert('revert', type)
    }

    messageHandler(payload: Buffer) {
        this.lastUpdate = new Date()
        let msg: Buffer = payload.slice(1)
        switch (payload[0]) {
            case 0x00: 
                clearInterval(this.captchaInterval)
                break
            case 0x42:
                this.location = {
                    x: msg.readFloatBE(0),
                    y: msg.readFloatBE(4)
                }
                break
            case 0x43:
                this.workingTime = msg.readUInt32BE()
                break
            case 0x44:
                let nDoors = msg[0]
                let doors: Door[] = []
                for (let byte = 0; byte * 8 < nDoors; byte++) {
                    for (let bit = 0; bit < 8 && byte * 8 + bit < nDoors; bit++) {
                        let opened = (((msg[byte + 1] >> (7 - bit)) & 0x1) == 1) ? true : false
                        doors.push({ opened: opened })
                    }
                }
                this.doors = doors
                break
            case 0x45:
                let nTypes = msg[0]
                this.instruments = new Map()
                for (let i = 0; i < nTypes; i++) {
                    this.instruments.set(
                        msg[3 * i + 1],
                        {
                            total: msg[3 * i + 2],
                            remained: msg[3 * i + 3]
                        })
                }
                break
            case 0x51:
            case 0x52:
                {
                    let token = msg[0]
                    let succeeded: boolean = msg[1] == 1
                    let process = this.interactions.get(token)
                    if (process === undefined) {
                        logger.warn('invalid token ' + token)
                    } else {
                        if (succeeded) process.onSuccess()
                        else process.onFailure()
                    }
                    break
                }
            default:
                logger.warn("unknown payload 0x" + payload[0].toString(16))
        }
    }
}

export interface Interaction {
    iotToken: Number
    onSuccess: Function
    onFailure: Function
}

export enum RentingOrRevertingStatus {
    UNSTARTED = "unstarted",
    WAITING = "waiting",
    SUCCEEDED = "succeeded",
    FAILED = "failed"
}
