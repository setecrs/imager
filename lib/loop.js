'use strict'

module.exports = function loop (callback) {
  return Promise.resolve(callback())
  .then(() => { return loop(callback) })
  .catch((err) => {
    console.log(err)
    return loop(callback)
  })
}
