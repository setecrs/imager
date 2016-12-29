'use strict'

const Promise = require('bluebird')
const readline = require('readline')

module.exports = function ask (prompt) {
  var rl = readline.createInterface(process.stdin, process.stdout)
  rl.setPrompt(prompt)
  rl.prompt()
  return new Promise((resolve, reject) => {
    rl.on('line', function (line) {
      rl.close()
      if (line) {
        resolve(line)
      } else {
        reject(line)
      }
    })
  })
}
