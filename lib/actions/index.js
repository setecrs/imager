'use strict'

const check = require('./check')
const register = require('./register')
const image = require('./image')
const list = require('./list')

let actions = {
  list: list,
  register: register,
  check: check,
  image: image
}

module.exports = actions
