'use strict'

const child = require('child_process')
const Promise = require('bluebird')

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
module.exports = exec
