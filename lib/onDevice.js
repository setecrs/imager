'use strict'

const config = require('config')
const redis = require('redis')
const _ = require('underscore')
const wagner = require('wagner-core')
require('../models')

function parseMessage (message) {
  let env = {}
  message.split('\n').forEach(x => {
    let args = x.split('=')
    env[args[0]] = args.slice(1).join('=')
  })
  let result = {
    device: env.DEVNAME,
    properties: _.pick(env,
      'SIZE',
      'ID_PART_TABLE_TYPE',
      'ID_PART_TABLE_UUID',
      'ID_VENDOR',
      'ID_MODEL',
      'ID_SERIAL_SHORT',
      'ID_MODEL_ID',
      'ID_VENDOR_ID',
      'ID_FS_UUID'
    ),
    env: env
  }
  return result
}

function onDevice (callback, once) {
  let client = redis.createClient(config.redis)
  function handler (channel, message) {
    let result = parseMessage(message)
    if (result.env.DEVTYPE !== 'partition') {
      if (once) {
        client.unsubscribe('message')
        client.removeAllListeners('message')
      }
      // console.log(result.device)
      // console.log(result.properties)
      wagner.invoke((Material) => {
        let query = {}
        _.each(result.properties, (v, k) => {
          query['properties.' + k] = v
        })
        Material.find(query)
        .then(docs => {
          return callback(result, docs)
        })
      })
    }
  }
  client.on('message', handler)
  client.subscribe('udev')
}
module.exports = onDevice
