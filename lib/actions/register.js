'use strict'
const Material = require('../models/material')

module.exports = function register (device, params) {
  return Material.findOnlyOne(params.material)
  .then((material) => {
    if (material.properties.udev) {
      if (params.override !== 'true') {
        return Promise.reject('Material already exists and override=true not set.')
      }
    }
    material.properties = device.properties
    return material.save()
  })
}
