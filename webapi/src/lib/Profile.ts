import { model, Schema, Document } from 'mongoose'

export interface Profile extends Document{
    uuid: string,
    name?: string 
}

export const ProfileModel = model<Profile>('Profile', new Schema({
    uuid: {type: String, required: true, unique: true}, 
    name: {type: String, required: false}
}))

export interface TestObject extends Document{
    str: string
    obj: {
        str: string,
        int: number
    }
}
