'use strict'

const Promise = require('bluebird')
const wagner = require('wagner-core')

module.exports = function checkUniq (mat) {
  return new Promise((resolve, reject) => {
    wagner.invoke((Material) => {
      Material.find({material: mat})
      .exec()
      .then(docs => {
        if (docs.length === 0) {
          console.log('material not found')
          reject()
        }
        if (docs.length === 1) {
          resolve(docs[0])
        }
        if (docs.length > 1) {
          console.log('more than 1 material found')
          reject()
        }
      })
    })
  })
}
