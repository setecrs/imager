'use strict'

const spawn = require('../utils/spawn')
const Promise = require('bluebird')
const lockfile = Promise.promisifyAll(require('lockfile'))
const ddrescueloginfo = require('../utils/ddrescueloginfo')
const path = require('path')
const fs = Promise.promisifyAll(require('fs-extra'))
const Material = require('../models/material')
const assert = require('assert')
const axios = require('axios')
const config = require('config')

const url = `${config.EVENTS_URL}v2/events`

module.exports = function image (device, params) {
  return Material.findOnlyOne(params.material)
  .then((material) => {
    assert.deepEqual(material.properties, device.properties)
    let command = `${__dirname}/../../imager/imager.sh`
    let args = [device.path, material.path]
    let lockpath = material.path + '.lock'
    let logpath = path.join(path.dirname(material.path), 'imager.dbg')
    let ddrescuelogpath = path.join(path.dirname(material.path), 'ddrescue.log')
    return ddrescueloginfo(ddrescuelogpath)
    .then((copysize) => {
      if (copysize === Number(material.properties.udev.SIZE) * 512) {
        return 'image already 100% done'
      } else {
        return fs.ensureDirAsync(path.dirname(lockpath))
        .then(() => {
          lockfile.lockAsync(lockpath)
          .then(() => {
            return axios.post(url, {
              channel: 'imager',
              type: 'imager started',
              evidence: material.id
            })
          })
          .then(() => {
            function updateStatus () {
              return ddrescueloginfo(ddrescuelogpath)
              .then((size) => {
                let giga = (size / (Math.pow(1024, 3))).toFixed(1) + 'G'
                let percent = (size / (material.properties.udev.SIZE * 512)) * 100
                percent = percent.toFixed(2) + '%'
                device.status = {
                  material: material.material,
                  gigabytes: giga,
                  percent: percent,
                  running: true
                }
              })
            }
            let stream = fs.createWriteStream(logpath)
            let monitor = setInterval(updateStatus, 5000)
            return spawn(command, args, {}, stream)
            .then(() => {
              material.state = 'todo'
              return material.save()
              .then(() => {
                return axios.post(url, {
                  channel: 'imager',
                  type: 'imager done',
                  evidence: material.id
                })
              })
              .catch(err => {
                console.log(err)
              })
            })
            .catch((error) => {
              device.error = error
              return axios.post(url, {
                channel: 'imager',
                type: 'imager failed',
                error: error,
                evidence: material.id
              })
              .catch(err => {
                console.log(err)
              })
            })
            .finally(() => {
              clearInterval(monitor)
              axios.post(url, {
                channel: 'imager',
                type: 'imager stopped',
                evidence: material.id
              })
              .catch(err => {
                console.log(err)
              })
              stream.end()
              updateStatus()
              .then(() => {
                device.status.running = false
              })
            })
          })
          .catch((error) => { device.error = error })
          .finally(() => {
            lockfile.unlock(lockpath)
          })
          return 'imaging started'
        })
      }
    })
  })
}
