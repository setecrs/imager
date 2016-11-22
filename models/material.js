'use strict'

const wagner = require('wagner-core')

wagner.factory('Material', (mongoose, materialSchema) => {
  let model = mongoose.model('material', materialSchema)
  model.changeState = (id, oldState, newState, runningOn) => {
    return model.update({
      _id: id,
      state: oldState
    }, {$set: {
      state: newState,
      run_at: runningOn
    }})
  }
  return model
})
