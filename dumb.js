'use strict'

const config = require('config')
const redis = require('redis')
const _ = require('underscore')

function parseMessage (message) {
  console.log('udev message via redis:', message)
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

function onDevice () {
  let client = redis.createClient(config.redis)
  function handler (channel, message) {
    let result = parseMessage(message)
    if (result.env.DEVTYPE !== 'partition') {
      console.log('device:', result.device)
      console.log('properties:', result.properties)
    }
  }
  client.on('message', handler)
  client.subscribe('udev')
}

onDevice()
