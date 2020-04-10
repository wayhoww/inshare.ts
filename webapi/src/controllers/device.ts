import * as express from 'express'
import { getLogger } from 'log4js'
import * as Config from '../../../config/config'
import { deviceManager } from '../helper/instances'

const logger = getLogger(Config.WEBAPI_LOGGER_LEVEL)

export const router = express.Router()

router.get('/list', async (req, res) => {
    let deviceMap = deviceManager.devices
    let devices: any[] = []
    for(let [key, device] of deviceMap){
        devices.push({
            deviceID: device.id,
            location: device.location,
            workingTime: device.workingTime,
            doors: device.doors,
            lastUpdate: device.lastUpdate,
            captchas: device.captchas,
            instruments: Array.from(device.instruments.values())
        })
    }

    res.json({
        status: 'accept',
        devices: devices
    })
})