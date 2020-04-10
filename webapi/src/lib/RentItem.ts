
import { model, Schema, Document } from 'mongoose'

export interface RentItem extends Document{
    uuid: string,
    userUUID: string,
    fromID: string,
    revertToID?: string,
    typeID: number,
    rentedTime: Date,
    revertedTime?: Date,
    reverted: boolean
}

export const RentItemModel = model<RentItem>('RentItem', new Schema({
    uuid: { type: String, required: true, unique: true },
    userUUID: {type: String, required: true},
    fromID: { type: String, required: true },
    revertToID: { type: String, required: false },
    typeID: { type: Number, required: true },
    rentedTime: { type: Date, required: true },
    revertedTime: { type: Date, required: false },
    reverted: { type: Boolean, required: true }
}))

