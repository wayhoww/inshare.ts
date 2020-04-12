import { model, Schema, Document } from 'mongoose'
import { RentedItem, RentItemModel, RentedItemStatus } from './RentedItem'
import { Profile, ProfileModel } from './Profile'
import { Device } from './Device'
import { v1 as UUID} from 'uuid'
import { getLogger } from 'log4js'
import * as Config from '../helper/config'

const logger = getLogger(Config.WEBAPI_LOGGER_LEVEL)

export enum RentingOrRevertingStatus{ 
    UNSTARTED = "unstarted",
    WAITING = "waiting", 
    SUCCEEDED = "succeeded", 
    FAILED = "failed" 
}

interface UserDS extends Document{
    uuid: string,
    rentingOrReverting: boolean,
    latestRentingOrRevertingResult: RentingOrRevertingStatus
}

export const UserModel = model<UserDS>('User', new Schema({
    uuid: {type: String, required: true}, 
    // 不是说是在renting还是在reverting，而是问有没有在renting或reverting
    rentingOrReverting: {type: Boolean, required: true},
    latestRentingOrRevertingResult: {type: RentingOrRevertingStatus, required: true}
}))

export type Updator<T> = {[K in keyof T]?: T[K]}

// User 绑定数据库，其他几个数据先不绑定数据库了
export class User{
    // 这几个信息存在内存中算了    
    get rentingOrReverting(): Promise<boolean>{
        return (async () => {
            let ds =  await UserModel.findOne({uuid: this.uuid})
            if(ds !== null && ds !== undefined) return ds.rentingOrReverting
            else throw new Error('cannot found user ' + this.uuid)
        })()
    }

    setRentingOrReverting(val: boolean) {
        return UserModel.findOneAndUpdate({uuid: this.uuid}, {rentingOrReverting: val})
    }

    get latestRentingOrRevertingResult() : Promise<RentingOrRevertingStatus>{
        return (async () => {
            let ds =  await UserModel.findOne({uuid: this.uuid})
            if(ds !== null && ds !== undefined ) return ds.latestRentingOrRevertingResult
            else throw new Error('cannot found user ' + this.uuid)
        })()
    }

    async setLatestRentingOrRevertingResult(val: RentingOrRevertingStatus){
        return await UserModel.findOneAndUpdate({uuid: this.uuid}, {latestRentingOrRevertingResult: val})
    }

    get profile(): Promise<Profile>{
        return (async () => {
            let ds =  await ProfileModel.findOne({uuid: this.uuid})
            if(ds !== null && ds !== undefined) return ds
            else throw new Error('cannot found user ' + this.uuid)
        })()
    }

    async updateProfile(val: Updator<Profile>){
        return (await this.profile).updateOne(val)
    }

    // 还没归还的物件
    get rented(): Promise<Map<string, RentedItem> >{
        return (async()=>{
            let items = await RentItemModel.find({userUUID: this.uuid, status: RentedItemStatus.RENTED})
            let map = new Map<string, RentedItem>()
            for(let item of items){
                map.set(item.uuid, item)
            }
            return map
        })()
    }

    removeRented(itemid: string){
        return RentItemModel.remove({uuid: itemid})
    }

    addRented(item: RentedItem){
        item.userUUID = this.uuid
        return item.save()
    }

    // 包括归还的和尚未归还的
    get history(): Promise<Map<string, RentedItem >>{
        return (async()=>{
            let items = await RentItemModel.find({userUUID: this.uuid})
            let map = new Map<string, RentedItem>()
            for(let item of items){
                map.set(item.uuid, item)
            }
            return map
        })()
    }

    // 所有历史！包括还没归还的
    getHistory(skip: number = 0, limit?: number): Promise<Map<string, RentedItem >>{
        return (async()=>{
            let items = limit === undefined ? 
                await RentItemModel.find({userUUID: this.uuid}).skip(skip) : 
                await RentItemModel.find({userUUID: this.uuid}).skip(skip).limit(limit)
            let map = new Map<string, RentedItem>()
            for(let item of items){
                map.set(item.uuid, item)
            }
            return map
        })()
    }

    removeHistory(itemid: string){
        return RentItemModel.remove({uuid: itemid})
    }

    addHistory(item: RentedItem){
        item.userUUID = this.uuid
        item.revertedTime = new Date()
        item.status = RentedItemStatus.REVERTED
        return item.save()
    }

    moveToHistory(uuid: string, device: Device) {
        return RentItemModel.findOneAndUpdate({uuid: uuid}, {
            revertToID: device.id, 
            status: RentedItemStatus.REVERTED, 
            revertedTime: new Date()
        })
    }

    static async newUser(){
        let uuid = UUID()
        await new UserModel({
            uuid: uuid,
            rentingOrReverting: false,
            latestRentingOrRevertingResult: RentingOrRevertingStatus.UNSTARTED
        }).save()
        return new User(uuid)
    }

    constructor(public uuid: string){ }

    async permitToRent(){
        return (await this.rented).size === 0
    }

    // 如果以及再借用其他物件了：直接返回false
    //                         否则返回true
    async tryToRent(device: Device, typeid: number){
        if((await this.rentingOrReverting) === true) return TryToRentOrRevertResult.DOING
        if((await this.permitToRent()) === false) return TryToRentOrRevertResult.NO_PERMISSION
        this.setRentingOrReverting(true)
        this.setLatestRentingOrRevertingResult(RentingOrRevertingStatus.WAITING)
        logger.debug('User info is checked')
        device.rent(typeid)
            .then(()=>{
                logger.debug('renting succeeded')
                const doc: Updator<RentedItem> = {
                    uuid: UUID(),
                    typeID: typeid,
                    fromID: device.id,
                    rentedTime: new Date(),
                    status: RentedItemStatus.RENTED,
                    userUUID: this.uuid
                }
                this.addRented(new RentItemModel(doc))
                this.setLatestRentingOrRevertingResult(RentingOrRevertingStatus.SUCCEEDED)
            })
            .catch((err)=>{
                logger.error(err)
                const doc: Updator<RentedItem> = {
                    uuid: UUID(),
                    typeID: typeid,
                    fromID: device.id,
                    rentedTime: new Date(),
                    status: RentedItemStatus.UNRENTED,
                    userUUID: this.uuid
                }
                this.addRented(new RentItemModel(doc))
                this.setLatestRentingOrRevertingResult(RentingOrRevertingStatus.FAILED)
            })
            .finally(()=>{this.setRentingOrReverting(false)})
        return TryToRentOrRevertResult.ACCEPTED
    }

    async tryToRevert(device: Device, uuid: string){
        if(await this.rentingOrReverting === true) return TryToRentOrRevertResult.DOING
        let rented = await this.rented
        if(rented.size === 0) return TryToRentOrRevertResult.NO_PERMISSION
        let item_ = rented.get(uuid)
        if(item_ === undefined){
            return TryToRentOrRevertResult.NO_PERMISSION
        }else{
            let item: RentedItem = item_
            this.setRentingOrReverting(true)
            this.setLatestRentingOrRevertingResult(RentingOrRevertingStatus.WAITING)
            device.revert(item.typeID)
                .then(()=>{
                    this.moveToHistory(uuid, device)
                    item.revertToID = device.id
                    this.setLatestRentingOrRevertingResult(RentingOrRevertingStatus.SUCCEEDED)
                }).catch(()=>{
                    this.setLatestRentingOrRevertingResult(RentingOrRevertingStatus.FAILED)
                }).finally(()=>{
                    this.setRentingOrReverting(false)
                })
            return TryToRentOrRevertResult.ACCEPTED
        }
    }
}

export enum TryToRentOrRevertResult{
    ACCEPTED = "accepted",
    DOING = "renting",
    NO_PERMISSION = "no_permission" 
}