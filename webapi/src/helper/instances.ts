import { DeviceManager } from "../lib/Device";
import * as Config from '../helper/config'

export const deviceManager = new DeviceManager(Config.MQTT_SERVER, Config.MQTT_PREFIX)

