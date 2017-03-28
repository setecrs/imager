'use strict'

const config = require('config')
const redis = require('redis')

function onDevice () {
  let client = redis.createClient(config.redis)
  function handler (channel, message) {
    let result = JSON.parse(message)
    console.log(channel, result)
  }
  client.on('message', handler)
  client.subscribe('udev')
}

onDevice()
