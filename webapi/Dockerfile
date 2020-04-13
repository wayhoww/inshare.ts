FROM node

WORKDIR /var/www/
COPY . /var/www/

EXPOSE 443

RUN . ./setup-env.sh && npm install --registry=https://registry.npm.taobao.org 
RUN npm run build

ENTRYPOINT node built/app.js
