'use strict'

const onDevice = require('./lib/onDevice')
const checkMat = require('./lib/checkMat')
const exec = require('./lib/exec')

onDevice((device, docs) => {
  console.log('device', device.device)
  if (docs.length === 0) {
    console.log('No material found with these properties in the database.')
  } else {
    docs.forEach(doc => {
      console.log('image path', doc.path)
      checkMat(device, doc)
    })
  }
})

exec('udevadm trigger -s block')
