'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const onDevice = require('./utils/onDevice')
const actions = require('./actions')

let app = express.Router()
let devices = {}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))

app.use('/:device/:action/', (req, res) => {
  return actions[req.params.action](devices[req.params.device], req.query)
  .then((result) => { return res.json(result) })
  .catch(reason => { return res.json({error: reason}) })
})

app.use('/:device/', (req, res) => {
  return res.json(devices[req.params.device])
})

app.use('/', (req, res) => {
  return res.json(devices)
})

onDevice((device) => {
  console.log(device.action, device.path)
  if (device.action === 'remove') {
    delete devices[device.id]
  } else {
    if (!device.id.match(/^loop|^ram/)) {
      devices[device.id] = device
    }
  }
})

module.exports = app
