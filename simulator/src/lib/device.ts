import * as mqtt from 'mqtt'

export interface Door {
    opened: boolean;
}

export interface Instrument {
    typeid: number;
    total: number;
    remained: number;
}

export interface DeviceData {
    deviceID: string;
    location: {
        x: number;
        y: number;
    };
    workingTime: number;
    doors: {
        opened: boolean;
    }[];
    captcha: string;
    instruments: {
        typeid: number;
        total: number;
        remained: number;
    }[];
}

export class Device {
    messageHandler(topic: string, payload: Buffer) {
        const msg = payload.slice(1)
        switch(payload[0]){
            case 0xC1:
                {
                    const str = msg.toString()
                    const idx = str.indexOf('\u0000')
                    this.data.captcha = str.slice(0, idx)
                }
                break;
            case 0xA2: this.sendLocation(); break;
            case 0xA3: this.sendWorkingTime(); break;
            case 0xA4: this.sendDoors(); break;
            case 0xA5: this.sendInstruments(); break;
            case 0xB1: this.rentRequest(msg[0], msg[1]); break;
                
            default: if(this.onError) this.onError(`收到未知指令：${payload}`);
        }
    }

    rentRequest(typeid: number, token: number) {
        let haveTheType = false;
        let remained = false;
        const success = Math.random() > 0.3;
        const delay =  Math.random() * 10000 + 2000;


        /* 真实设备应该在收到请求并同意借取的时候就让剩余数量数据自减 */
        if(success){
            for(const ins of this.data.instruments){
                if(typeid === ins.typeid){
                    haveTheType = true;
                    if(ins.remained > 0){
                        remained = true;
                        ins.remained--;
                        break;
                    }
                    break;
                }
            }
        } 

        const willRent = success && remained && haveTheType;
        setTimeout(()=>{
            this.publish(Buffer.from([0x51, token, willRent ? 1 : 2]));
        }, delay)

        if(willRent && this.onRent){
            this.onRent(token, delay, true)
        }else if(!willRent && this.onRent){
            this.onRent(token, delay, false, haveTheType, remained, success)
        }
    }

    publish(payload: Buffer) {
        this.client.publish(this.prefix + '/client/' + this.data.deviceID, payload)
    }

    sendAll() {
        this.sendLocation()
        this.sendWorkingTime()
        this.sendDoors()
        this.sendInstruments()
    }

    sendLocation() {
        const buffer = new Buffer(9)
        buffer.writeUInt8(0x42)
        buffer.writeFloatBE(this.data.location.x, 1)
        buffer.writeFloatBE(this.data.location.y, 5)
        this.publish(buffer)
    }

    sendWorkingTime() {
        const buffer = new Buffer(5)
        buffer.writeUInt8(0x43)
        buffer.writeUInt32BE(this.data.workingTime, 1)
        this.publish(buffer)
    }

    sendDoors() {
        const arr = [0x44]
        const doors = this.data.doors
        const len = doors.length
        arr.push(len)
        for (let byte = 0; byte * 8  < len; byte++) {
            let val = 0
            // 做足8次，把数据留到高位
            for (let bit = 0; bit < 8; bit++) {
                val <<= 1;
                if(byte * 8 + bit < len && doors[byte * 8 + bit].opened){
                    val |= 1;
                }
            }
            arr.push(val)
        }
        this.publish(Buffer.from(arr))
    }

    sendInstruments() {
        const arr = [0x45]
        const instruments = this.data.instruments
        arr.push(instruments.length)
        for(const ins of instruments){
            arr.push(ins.typeid)
            arr.push(ins.total)
            arr.push(ins.remained)
        }
        this.publish(Buffer.from(arr))
    }

    private client: mqtt.MqttClient;
    public onConnect?: Function
    public onError?: Function
    public onRent?: Function
    constructor(url: string, public prefix: string, public data: DeviceData) {
        const option: mqtt.IClientOptions = {
            will: {
                qos: 2,
                topic: prefix, /* 这好像也没什么用 */
                payload: "", /* 为什么必须要指定这个 */
                retain: true,
            }
        }
        this.client = mqtt.connect(url, option)
        this.client.on('connect', () => {
            if (this.onConnect) this.onConnect()    
            this.client.subscribe(this.prefix + '/server');
            this.client.subscribe(this.prefix + '/server/' + this.data.deviceID)
            this.sendAll()
        })
        this.client.on('error', (err)=>{
            if (this.onError) this.onError(JSON.stringify(err))
        })
        this.client.on('message', (topic, msg) => { this.messageHandler(topic, msg) })
    }

    exit() {
        this.publish(Buffer.from([0x00]))
        this.client.unsubscribe(this.prefix + '/server');
        this.client.unsubscribe(this.prefix + '/server/' + this.data.deviceID)
    }
}