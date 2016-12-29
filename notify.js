'use strict'

const config = require('config')
const redis = require('redis')

let client = redis.createClient(config.redis)

process.stdin.on('data', chunk => {
  client.publish('udev', chunk)
})

process.stdin.on('end', () => {
  setTimeout(function () {
    client.quit(() => {
      process.exit(0)
    })
  }, 10)
})
