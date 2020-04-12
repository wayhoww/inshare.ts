
import { model, Schema, Document } from 'mongoose'

export enum RentedItemStatus{
    RENTED, UNRENTED, REVERTED
}

export interface RentedItem extends Document{
    uuid: string,
    userUUID: string,
    fromID: string,
    revertToID?: string,
    typeID: number,
    rentedTime: Date,
    revertedTime?: Date,
    status: RentedItemStatus
}

export const RentItemModel = model<RentedItem>('RentedItem', new Schema({
    uuid: { type: String, required: true, unique: true },
    userUUID: {type: String, required: true},
    fromID: { type: String, required: true },
    revertToID: { type: String, required: false },
    typeID: { type: Number, required: true },
    rentedTime: { type: Date, required: true },
    revertedTime: { type: Date, required: false },
    status: { type: RentedItemStatus, required: true }
}))

