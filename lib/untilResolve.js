'use strict'

module.exports = function untilResolve (callback) {
  return callback()
  .catch(() => {
    return untilResolve(callback)
  })
}
