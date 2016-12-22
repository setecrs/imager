'use strict'

const onDevice = require('./lib/onDevice')
const checkMat = require('./lib/checkMat')

onDevice((device, docs) => {
  if (docs.length === 0) {
    console.log('device', device.device)
    console.log('No material found with these properties in the database.')
  } else {
    docs.forEach(doc => {
      console.log('device', device.device)
      console.log('image path', doc.path)
      checkMat(device, doc)
    })
  }
})
