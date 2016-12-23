'use strict'

const spawn = require('./spawn')

function runimager (device, metadata) {
  let command = `${__dirname}/../imager/imager.sh`
  let args = [device.device, metadata.path]
  spawn(command, args)
}

module.exports = runimager
