'use strict'

const child = require('child_process')
const Promise = require('bluebird')

function spawn (command, args, options, output) {
  console.log(command, args, options)
  return new Promise((resolve, reject) => {
    if (!output) {
      output = process.stdout
    }
    let proc = child.spawn(command, args, options)
    proc.stdout.on('data', (data) => {
      output.write(data.toString())
    })
    proc.stderr.on('data', (data) => {
      output.write(data.toString())
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
