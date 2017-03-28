'use strict'
const config = require('config')
const redis = require('redis')

function onDevice (callback) {
  let client = redis.createClient(config.redis)
  client.on('message', function handler (channel, message) {
    let result = JSON.parse(message)
    if (result.env.DEVTYPE !== 'partition') {
      delete result.env
      return callback(result)
    }
  })
  client.subscribe('udev')
}

module.exports = onDevice
