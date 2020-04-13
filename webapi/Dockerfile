FROM node

WORKDIR /var/www/
COPY . /var/www/

EXPOSE 443

ENV MQTT_SERVER="mqtt://example.com:1883/";
ENV MQTT_PREFIX="/inshare";
ENV WEBAPI_PROTOCOL="http";
ENV WEBAPI_PORT=3000;
ENV WEBAPI_LOGGER_LEVEL="develop"
ENV MONGODB_URL="mongodb://localhost:27017/inshare"
ENV CERT_KEY="/conf/key.key"
ENV CERT_CRT="/conf/key.crt"
ENV WEIXIN_APPID="someid"
ENV WEIXIN_SECRET="somekey"
ENV NODE_ENV="development"

RUN npm install --registry=https://registry.npm.taobao.org 
RUN npm run build

ENTRYPOINT node built/app.js
