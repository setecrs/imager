'use strict'

const onDevice = require('./lib/onDevice')
const runimager = require('./lib/runimager')

onDevice((device, docs) => {
  if (docs.length === 0) {
    console.log('No material found with these properties in the database.')
  } else if (docs.length === 1) {
    let doc = docs[0]
    runimager(device, doc)
  } else {
    console.log('Multiples entries found matching current device:')
    docs.forEach(doc => {
      console.log(doc.material)
    })
  }
})
