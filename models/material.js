'use strict'

const wagner = require('wagner-core')

wagner.factory('Material', (mongoose, materialSchema) => {
  let model = mongoose.model('material', materialSchema)
  return model
})
