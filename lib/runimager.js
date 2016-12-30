'use strict'

const spawn = require('./spawn')
const Promise = require('bluebird')
const lockfile = Promise.promisifyAll(require('lockfile'))
const ddrescueloginfo = require('./ddrescueloginfo')
const path = require('path')
const fs = Promise.promisifyAll(require('fs-extra'))

function runimager (device, metadata) {
  let command = `${__dirname}/../imager/imager.sh`
  let args = [device.device, metadata.path]
  let lockpath = metadata.path + '.lock'
  return ddrescueloginfo(path.join(path.dirname(metadata.path), 'ddrescue.log'))
  .then((copysize) => {
    if (copysize === Number(metadata.properties.SIZE) * 512) {
      return
    } else {
      return fs.ensureDirAsync(path.dirname(lockpath))
      .then(() => {
        lockfile.lockAsync(lockpath)
      })
      .then(() => {
        return spawn(command, args)
        .then((x) => {
          lockfile.unlockAsync(lockpath)
          .then(() => { return x })
        })
        .catch((err) => {
          lockfile.unlockAsync(lockpath)
          .then(() => { throw new Error(err) })
        })
      })
    }
  })
}

module.exports = runimager
