'use strict'
const Promise = require('bluebird')

module.exports = function check (device) {
  return new Promise((resolve, reject) => {
    resolve({device: device.id, action: 'check'})
  })
}
