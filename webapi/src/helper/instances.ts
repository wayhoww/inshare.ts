import { DeviceManager } from "../lib/Device";
import * as Config from '../../../config/config'

export const deviceManager = new DeviceManager(Config.MQTT_SERVER, Config.MQTT_PREFIX)

