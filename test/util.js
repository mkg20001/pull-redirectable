'use strict'

const pull = require('pull-stream')
const assert = require('assert')

module.exports = {
  pullCompare: (v, cb) => pull.collect((err, res) => {
    if (cb) {
      if (err) return cb(err)
    } else {
      if (err) throw err
    }
    assert.deepEqual(v, res)
    if (cb) cb()
  })
}
