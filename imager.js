'use strict'

const onDevice = require('./lib/onDevice')
const runimager = require('./lib/runimager')
const exec = require('./lib/exec')

onDevice((device, docs) => {
  if (docs.length === 0) {
    console.log(device.device, '- No material found with these properties in the database.')
  } else if (docs.length === 1) {
    let doc = docs[0]
    runimager(device, doc)
    .then(() => {
      if (doc.state === 'hold') {
        doc.state = 'todo'
        return doc.save()
      } else {
        return doc
      }
    })
    .then((doc) => {
      console.log(device.device, doc.material, 'Ok')
    })
  } else {
    console.log(device.device, '- Multiples entries found matching current device:')
    docs.forEach(doc => {
      console.log(doc.material)
    })
  }
})

exec('udevadm trigger -s block')
