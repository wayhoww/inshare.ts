import * as fs from 'fs'

export const WEBAPI_LOGGER_LEVEL = process.env['WEBAPI_LOGGER_LEVEL'] || 'develop'
export const MONGODB_URL = process.env['MONGODB_URL'] || 'mongodb://127.0.0.1:27017/inshare'
export const MQTT_SERVER = process.env['MQTT_SERVER'] || 'mqtt://example.com:1883/'
export const MQTT_PREFIX = process.env['MQTT_PREFIX'] || '/inshare'
export const WEBAPI_PROTOCOL = process.env['WEBAPI_PROTOCOL'] || 'http'
export const WEBAPI_PORT = parseInt(process.env['WEBAPI_PORT'] || "3000") || 3000
export const HTTPS_OPTIONS = WEBAPI_PROTOCOL === 'https' ? {
    key: fs.readFileSync(process.env['CERT_KEY'] || ""),
    cert: fs.readFileSync(process.env['CERT_CRT'] || "")
} : {}

export const WEIXIN_APPID = process.env['WEIXIN_APPID'] || "";
export const WEIXIN_SECRET = process.env['WEIXIN_SECRET']