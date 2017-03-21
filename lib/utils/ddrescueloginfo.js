'use strict'

const exec = require('./exec')

module.exports = function ddrescueloginfo (path) {
  return exec(`grep '^0x.*0x.*+$' "${path}" | awk '{print $2}'`)
  .then(stdout => {
    let success = 0
    stdout.split('\n').forEach(x => {
      success += Number(x)
    })
    return success
  })
  .catch((err) => {
    console.log(err)
    return 0
  })
}
