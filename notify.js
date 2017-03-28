'use strict'

const _ = require('underscore')
const Promise = require('bluebird')
const config = require('config')
const redis = require('redis')
Promise.promisifyAll(redis.RedisClient.prototype)
const child = require('child_process')

function parseMessage (message) {
  let env = {}
  message.split('\n').forEach(x => {
    if (x) {
      let args = x.split('=')
      env[args[0]] = args.slice(1).join('=')
    }
  })
  let result = {
    id: env.DEVNAME.replace('/dev/', ''),
    path: env.DEVNAME,
    action: env.ACTION,
    properties: {
      udev: _.pick(env,
      'SIZE',
      'ID_PART_TABLE_TYPE',
      'ID_PART_TABLE_UUID',
      'ID_VENDOR',
      'ID_MODEL',
      'ID_SERIAL_SHORT',
      'ID_FS_UUID'
      )
    },
    env: env
  }
  return result
}

function getSmartData (path) {
  return new Promise((resolve, reject) => {
    let proc = child.spawn('smartctl', ['-i', path])
    let data = ''
    proc.stdout.on('data', (chunk) => {
      data += chunk
    })
    proc.stdout.on('end', () => {
      resolve(data)
    })
    proc.stderr.on('data', reject)
  }).then((data) => {
    let result = {}
    data.toString().split('\n').splice(3).forEach((x) => {
      if (x) {
        let splited = x.split(':')
        if (splited.length > 1) {
          if (!splited[0].endsWith(' is')) {
            result[splited[0]] = splited.splice(1).join(':').trim()
          }
        }
      }
    })
    return result
  })
}

Promise.resolve()
.timeout(5000)
.then(() => {
  let data = ''
  let deferred = Promise.defer()
  process.stdin.on('data', chunk => {
    data += chunk
  })
  process.stdin.on('end', () => {
    deferred.resolve(data)
  })
  return deferred.promise
}).then((data) => {
  return parseMessage(data)
}).then((parsed) => {
  return getSmartData(parsed.path)
  .timeout(2000)
  .then((data) => {
    parsed.properties.smart = data
    return parsed
  }).catch((error) => {
    console.log(error)
    return parsed
  })
}).then((parsed) => {
  let client = redis.createClient(config.redis)
  return client.publishAsync('udev', JSON.stringify(parsed))
  .then(() => {
    return client.quitAsync()
  })
}).then(() => {
  process.exit(0)
}).catch((error) => {
  console.log(error)
  process.exit(1)
})
