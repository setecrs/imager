'use strict'

const wagner = require('wagner-core')
const readline = require('readline')

function newMat (device) {
  var rl = readline.createInterface(process.stdin, process.stdout)
  rl.setPrompt('Material:')
  rl.prompt()
  rl.on('line', function (line) {
    if (line) {
      console.log([line])
      let mat = line
      wagner.invoke((Material) => {
        Material.find({material: mat})
        .exec()
        .then(docs => {
          if (docs.length === 0) {
            console.log('material not found')
          }
          if (docs.length === 1) {
            docs[0].properties = device.properties
            console.log(docs[0])
            return docs[0].save()
          }
          if (docs.length > 1) {
            console.log('more than 1 material found')
          }
        })
      })
    }
    rl.close()
  })
}
module.exports = newMat
