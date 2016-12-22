'use strict'

const onDevice = require('./lib/onDevice')
const Promise = require('bluebird')
const readline = require('readline')
const wagner = require('wagner-core')

function waitDevice () {
  return new Promise((resolve, reject) => {
    onDevice((device, docs) => {
      resolve({device: device, docs: docs})
    }, true) // Once=true
  })
}

function loop (callback) {
  return Promise.resolve(callback())
  .then(() => { return loop(callback) })
  .catch((err) => {
    console.log(err)
    return loop(callback)
  })
}

function untilResolve (callback) {
  return callback()
  .catch(() => {
    return untilResolve(callback)
  })
}

function readMaterial () {
  var rl = readline.createInterface(process.stdin, process.stdout)
  rl.setPrompt('Material:')
  rl.prompt()
  return new Promise((resolve, reject) => {
    rl.on('line', function (line) {
      rl.close()
      if (line) {
        resolve(line)
      } else {
        reject(line)
      }
    })
  })
}

function checkUniq (mat, device) {
  return new Promise((resolve, reject) => {
    wagner.invoke((Material) => {
      Material.find({material: mat})
      .exec()
      .then(docs => {
        if (docs.length === 0) {
          console.log('material not found')
          reject()
        }
        if (docs.length === 1) {
          docs[0].properties = device.properties
          return docs[0].save()
        }
        if (docs.length > 1) {
          console.log('more than 1 material found')
          reject()
        }
      })
    })
  })
}

loop(() => {
  return waitDevice()
  .then(result => {
    console.log(result.device.device)
    console.log(result.device.properties)
    return new Promise((resolve, reject) => {
      if (result.docs.length === 0) {
        resolve(result)
      } else if (result.docs.length === 1) {
        console.log(result.docs)
        reject('Material already in the database.')
      } else {
        console.log(result.docs)
        reject('Multiple materials match this device basic properties:')
      }
    })
  })
  .then(result => {
    return untilResolve(() => {
      return readMaterial()
      .then(mat => {
        return checkUniq(mat, result.device)
      })
    })
  })
})
