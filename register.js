'use strict'

const Promise = require('bluebird')
const loop = require('./lib/loop')
const waitDevice = require('./lib/waitDevice')
const untilResolve = require('./lib/untilResolve')
const ask = require('./lib/ask')
const getOneMat = require('./lib/getOneMat')

loop(() => {
  return waitDevice()
  .then(result => {
    console.log(result.device.device)
    console.log(result.device.properties)
    return new Promise((resolve, reject) => {
      if (result.docs.length === 0) {
        resolve(result)
      } else {
        console.log(result.docs)
        console.log('Material already in the database.')
        return untilResolve(() => {
          return ask('Is this really a new device? ')
          .then((resp) => {
            if ('yn'.match(resp.trim().toLowerCase())) {
              return Promise.resolve(resp.trim().toLowerCase() === 'y')
            } else {
              return Promise.reject()
            }
          })
        }).then((resp) => {
          if (resp) {
            resolve(result)
          } else {
            reject()
          }
        })
      }
    })
  })
  .then(result => {
    return untilResolve(() => {
      return ask('Material: ')
      .then(mat => {
        return getOneMat(mat)
      })
    })
    .then((doc) => {
      doc.properties = result.device.properties
      return doc.save()
    })
  })
  .then(() => {
    console.log('Ok')
  })
})
