'use strict'

const Promise = require('bluebird')
const loop = require('./lib/loop')
const waitDevice = require('./lib/waitDevice')
const untilResolve = require('./lib/untilResolve')
const ask = require('./lib/ask')
const getOneMat = require('./lib/getOneMat')
const runimager = require('./lib/runimager')

loop(() => {
  return waitDevice()
  .then(result => {
    console.log(result.device.device)
    console.log(result.device.properties)
    if (result.docs.length === 0) {
      return Promise.reject(
        'No material found with these properties in the database.'
      )
    } else {
      console.log(result.docs.map((x) => x.material))
      return Promise.resolve(result)
    }
  })
  .then(result => {
    return untilResolve(() => {
      return ask('Material: ')
      .then(mat => {
        return getOneMat(mat)
      })
    })
    .then((doc) => {
      return runimager(result.device, doc)
      .then(() => {
        doc.state = 'todo'
        return doc.save()
      })
    })
    .then((doc) => {
      console.log('Ok', doc.material)
    })
  })
})
