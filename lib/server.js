'use strict'

let api = require('./api')

const express = require('express')
const config = require('config')

let app = express()

app.use('/api', api)
app.use('/', express.static('frontend/'))

app.listen(config.listenport, config.listenaddress, () => {
  console.log('Listening at %s', config.listenport)
})
