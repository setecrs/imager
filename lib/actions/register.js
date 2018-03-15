'use strict'
const Material = require('../models/material')
const axios = require('axios')
const config = require('config')

const url =  `${config.EVENTS_URL}v2/events`

module.exports = function register (device, params) {
  return Material.findOnlyOne(params.material)
  .then((material) => {
    if (material.properties && material.properties.udev) {
      if (params.override !== 'true') {
        return Promise.reject('Material already exists and override=true not set.')
      }
    }
    material.properties = device.properties
    return material.save()
    .then(() => {
      return axios.post(url, {
        channel: 'imager',
        type: 'evidence saved',
        evidence: material.id
      })
    })
    .catch(err => {
      console.log(err)
    })
  })
}
