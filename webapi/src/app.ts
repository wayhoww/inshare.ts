import * as express from 'express'
import * as bodyParser from 'body-parser'
import * as mongoose from 'mongoose'
import { configure, getLogger } from 'log4js';
import * as Config from './helper/config'
import * as https from 'https'
 
configure({
    appenders: { 
        cheese: { type: 'file', filename: './log/inshare.log' },
        console: {type: 'console', level: 'debug'}
    },
    categories: {
        default:    { appenders: ['cheese', 'console'], level: 'info' },
        develop:    { appenders: ['console'], level: 'debug' },
        production: { appenders: ['cheese'], level: 'warn' },
    }
});
const logger = getLogger(Config.WEBAPI_LOGGER_LEVEL);


const DB_URL = Config.MONGODB_URL
mongoose.connect(DB_URL,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
}, (err) => {
    if (err) logger.fatal(`Cannot connect to database: ${DB_URL}`)
    else logger.info(`Database is connected`)
})

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use((req, res, next) => {
    logger.info(req.method, req.url)
    logger.info(req.body)
    logger.info(req.query)
    next()
})

import { router as userRouter } from './controllers/user'
app.use('/user', userRouter)

import { router as deviceRouter } from './controllers/device'
app.use('/device', deviceRouter)


if(Config.WEBAPI_PROTOCOL === 'http'){
    app.listen(Config.WEBAPI_PORT, () => { logger.info(`Listening on :${Config.WEBAPI_PORT}`)})
}else if(Config.WEBAPI_PROTOCOL === 'https'){
    https.createServer(Config.HTTPS_OPTIONS, app).listen(3000, ()=>{
        logger.info(`Listening on :${Config.WEBAPI_PORT}, and https is being used.`)
    })
}else{
    logger.fatal(`Unknown protocol: ${Config.WEBAPI_PROTOCOL}`)
}