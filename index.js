'use strict'

const config = require('config')
const redis = require('redis')
const _ = require('underscore')
const readline = require('readline')
const wagner = require('wagner-core')
const fs = require('fs')
const path = require('path')
const assert = require('assert')
const child = require('child_process')
const expect = require('chai').expect
const Mocha = require('mocha')

require('./models')
wagner.constant('config', require('config'))
wagner.factory('current', () => {
  return {}
})

let client = redis.createClient(config.redis)

let mocha = new Mocha({reporter: 'list'})
mocha.addFile('tests/checkMat.js')

client.on('message', (channel, message) => {
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
  if (env.DEVTYPE !== 'partition') {
    console.log(result.device)
    console.log(result.properties)
    wagner.invoke((Material) => {
      let query = {}
      _.each(result.properties, (v, k) => {
        query['properties.' + k] = v
      })
      Material.find(query)
      .then(docs => {
        if (docs.length === 0) {
          newMat(result)
        } else {
          docs.forEach(doc => {
            console.log(doc)
            checkMat(result, doc)
          })
        }
      })
    })
  }
})
client.subscribe('udev')

function exec (command) {
  return new Promise((resolve, reject) => {
    child.exec(command, (err, stdout, stderr) => {
      if (err) {
        return reject(err)
      }
      if (stderr) {
        return reject(stderr)
      }
      return resolve(stdout)
    })
  })
}

function checkMat (device, doc) {
  fs.stat(doc.path, (err, stats) => {
    expect(err).equal(null)
    let size = stats['size'] / 512

    if (size === Number(device.properties.SIZE)) {
      console.log('. image size ok')
    } else {
      console.log('x image size:', size)
    }

    let mydir = path.dirname(doc.path)
    fs.access(mydir + '/hashlog.md5', fs.F_OK, err => {
      if (!err) {
        console.log('. hashlog.md5 exists ')
        exec(`cat "${mydir}"/hashlog.md5 | wc -l`)
        .then(stdout => {
          expect(Number(stdout)).equal(Math.ceil(size / 2097152) + 1)
        })
        .then(() => {
          console.log('. number of lines on hashlog.md5 ok')
        })
        .catch(err => {
          console.log('x number of lines on hashlog.md5: ', err)
        })
      } else {
        console.log('x hashlog.md5 does not exist ', err)
      }
    })

    fs.access(mydir + '/SARD/IPED.log', fs.F_OK, err => {
      if (!err) {
        console.log('. SARD/IPED.log exists ')
        exec(`tail -n 1 "${mydir}/SARD/IPED.log"`)
        .then(stdout => {
          expect(stdout).equal('IPED finalizado.\n')
        })
        .then(() => {
          console.log('. IPED ok')
        })
        .catch(err => {
          console.log('x IPED: ', err)
        })
      } else {
        console.log('x SARD/IPED.log does not exist ', err)
      }
    })

    exec(`grep '^0x.*0x.*+$' "${mydir}/ddrescue.log" | awk '{print $2}'`)
    .then(stdout => {
      let success = 0
      stdout.split('\n').forEach(x => {
        success += Number(x)
      })
      expect(success / 512).equal(size)
    })
    .then(() => {
      console.log('. ddrescue ok')
    })
    .catch(err => {
      console.log('x ddrescue not complete: ', err)
    })
  })

  if (device.properties.ID_PART_TABLE_UUID) {
    exec(`blkid ${doc.path} | grep 'PTUUID="${device.properties.ID_PART_TABLE_UUID}"' | wc -l`)
    .then((stdout) => {
      expect(stdout).equal('1\n')
    })
    .then(() => {
      console.log('. partition table UUID on image ok')
    })
    .catch(err => {
      console.log('x partition table UUID on image: ', err)
    })
  }

  if (device.properties.ID_FS_UUID) {
    exec(`blkid ${doc.path} | grep 'UUID="${device.properties.ID_FS_UUID}"' | wc -l`)
    .then((stdout) => {
      expect(stdout).equal('1\n')
    })
    .then(() => {
      console.log('. filesystem UUID on image ok')
    })
    .catch(err => {
      console.log('x filesystem UUID on image: ', err)
    })
  }
}

function newMat (device) {
  var rl = readline.createInterface(process.stdin, process.stdout)
  rl.setPrompt('Material:')
  rl.prompt()
  rl.on('line', function (line) {
    if (line) {
      console.log([line])
      let mat = line
      wagner.invoke((Material) => {
        Material.find({material: mat})
        .exec()
        .then(docs => {
          if (docs.length === 0) {
            console.log('material not found')
          }
          if (docs.length === 1) {
            docs[0].properties = device.properties
            console.log(docs[0])
            docs[0].save()
            .then(() => {
              checkMat(device, docs[0])
            })
          }
          if (docs.length > 1) {
            console.log('more than 1 material found')
          }
        })
      })
    }
    rl.close()
  })
}
