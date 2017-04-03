'use strict'

const Promise = require('bluebird')
const _ = require('underscore')
const mongoose = require('./mongoose')
const materialSchema = require('./materialschema')

let model = mongoose.model('material', materialSchema)

model.findDevice = function findDevice (device) {
  let query = {}
  _.each(device.properties.udev, (v, k) => {
    query['properties.udev.' + k] = v
  })
  return model.find(query)
}

model.findOnlyOne = function findOnlyOne (id) {
  return model.find({material: id})
  .exec()
  .then(docs => {
    if (docs.length === 0) {
      return Promise.reject('material not found')
    }
    if (docs.length === 1) {
      return docs[0]
    }
    if (docs.length > 1) {
      return Promise.reject('more than 1 material found')
    }
  })
}

module.exports = model
