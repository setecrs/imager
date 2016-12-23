'use strict'

const child = require('child_process')
const Promise = require('bluebird')

function spawn (command, args, options) {
  return new Promise((resolve, reject) => {
    let proc = child.spawn(command, args, options)
    proc.stdout.on('data', (data) => {
      process.stdout.write(data.toString())
    })
    proc.stderr.on('data', (data) => {
      process.stdout.write(data.toString())
    })
    proc.on('close', (code) => {
      if (code) {
        reject(code)
      } else {
        resolve()
      }
    })
    proc.on('error', (err) => {
      reject(err)
    })
  })
}
module.exports = spawn
