import * as express from 'express'
import { getLogger } from 'log4js'
import * as Config from '../helper/config'
import { deviceManager } from '../helper/instances'
import { IODataStructure } from '../lib/IODataStructure'

const logger = getLogger(Config.WEBAPI_LOGGER_LEVEL)

export const router = express.Router()

router.get('/list', async (req, res) => {
    let deviceMap = deviceManager.devices
    let devices: IODataStructure.Device.Device[] = []
    for(let [, device] of deviceMap){
        const instruments: IODataStructure.Device.InstrumentType[] = []
        for(const [key, val] of device.instruments){
            instruments.push({
                typeID: key,
                typeName: "TODO",
                total: val.total,
                remained: val.remained
            })
        }
        devices.push({
            deviceID: device.id,
            location: device.location,
            workingTime: device.workingTime,
            doors: device.doors,
            lastUpdate: device.lastUpdate,
            captchas: device.captchas,
            instruments: instruments
        })
    }

    const rtn: IODataStructure.Response.DeviceList = {
        status: "ACCEPT",
        devices: devices
    }
    res.json(rtn)
})