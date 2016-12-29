'use strict'

const onDevice = require('./onDevice')

module.exports = function waitDevice () {
  return new Promise((resolve, reject) => {
    onDevice((device, docs) => {
      resolve({device: device, docs: docs})
    }, true) // Once=true
  })
}
