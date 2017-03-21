'use strict'
const Material = require('../models/material')

module.exports = function list (device) {
  return Material.findDevice(device)
}
