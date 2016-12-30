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
  let logpath = path.join(path.dirname(metadata.path), 'imager.log')
  let ddrescuelogpath = path.join(path.dirname(metadata.path), 'ddrescue.log')
  return ddrescueloginfo(ddrescuelogpath)
  .then((copysize) => {
    if (copysize === Number(metadata.properties.SIZE) * 512) {
      return
    } else {
      return fs.ensureDirAsync(path.dirname(lockpath))
      .then(() => {
        lockfile.lockAsync(lockpath)
      })
      .then(() => {
        let stream = fs.createWriteStream(logpath)
        let monitor = setInterval(function () {
          ddrescueloginfo(ddrescuelogpath)
          .then((size) => {
            let giga = (size / (Math.pow(1024, 3))).toFixed(1) + 'G'
            let percent = (size / (metadata.properties.SIZE * 512)) * 100
            percent = percent.toFixed(2) + '%'
            console.log(device.device, metadata.material, giga, percent)
          })
        }, 5000)
        return spawn(command, args, {}, stream)
        .finally(() => {
          clearInterval(monitor)
          lockfile.unlock(lockpath)
          stream.end()
        })
      })
    }
  })
}

module.exports = runimager
