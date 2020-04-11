import { model, Schema, Document } from 'mongoose'

export interface Profile extends Document{
    uuid: string,
    name?: string,
    region?: string,
    phone?: string,
    email?: string
}

export const ProfileModel = model<Profile>('Profile', new Schema({
    uuid: {type: String, required: true, unique: true}, 
    name: {type: String, required: false},
}))
