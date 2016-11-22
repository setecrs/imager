'use strict'

const mongoose = require('mongoose')
mongoose.Promise = require('bluebird')
const wagner = require('wagner-core')

wagner.factory('mongoose', (config) => {
  let url = `mongodb://${config.mongodb.host}:${config.mongodb.port}/${config.mongodb.db}`
  let connectWithRetry = () => {
    return mongoose.connect(url, function (err) {
      if (err) {
        console.error('Failed to connect to mongo on startup - retrying in 1 sec', err)
        setTimeout(connectWithRetry, 1000)
      }
    })
  }
  connectWithRetry()
  return mongoose
})

require('./materialschema')
require('./material')
