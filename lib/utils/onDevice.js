'use strict'
const _ = require('underscore')
const redis = require('redis')
const config = require('config')
const actions = require('../actions')

function parseMessage (message) {
  let env = {}
  message.split('\n').forEach(x => {
    let args = x.split('=')
    env[args[0]] = args.slice(1).join('=')
  })
  let result = {
    id: env.DEVNAME.replace('/dev/', ''),
    path: env.DEVNAME,
    actions: Object.keys(actions),
    properties: _.pick(env,
      'SIZE',
      'ID_PART_TABLE_TYPE',
      'ID_PART_TABLE_UUID',
      'ID_SERIAL_SHORT',
      'ID_FS_UUID'
    ),
    env: env
  }
  return result
}

function onDevice (callback) {
  let client = redis.createClient(config.redis)
  client.on('message', function handler (channel, message) {
    let result = parseMessage(message)
    if (result.env.DEVTYPE !== 'partition') {
      return callback(result)
    }
  })
  client.subscribe('udev')
}

module.exports = onDevice
