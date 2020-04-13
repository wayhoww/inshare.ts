FROM node

WORKDIR /var/www/
COPY . /var/www/

EXPOSE 443

RUN npm install --registry=https://registry.npm.taobao.org 

ENV MQTT_SERVER="mqtt://example.com:1883/"              \
    MQTT_PREFIX="/inshare"                              \
    WEBAPI_PROTOCOL="https"                             \
    WEBAPI_PORT=443                                     \
    WEBAPI_LOGGER_LEVEL="production"                    \
    MONGODB_URL="mongodb://localhost:27017/inshare"     \
    CERT_KEY="/key/key.key"                             \
    CERT_CRT="/key/key.crt"                             \
    WEIXIN_APPID="someid"                               \
    WEIXIN_SECRET="somekey"                             \
    NODE_ENV="production"

RUN npm run build

ENTRYPOINT node built/app.js