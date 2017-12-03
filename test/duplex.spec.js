/* eslint-env mocha */

'use strict'

const {pullCompare} = require('./util')

const redir = require('../src')

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const pull = require('pull-stream')
chai.use(dirtyChai)

const v = [1, 2, 3, 4]

describe('redirectable stream', () => {
  describe('duplex', () => {
    it('moves data from i to a to o', cb => {
      const s = redir.duplex()

      pull(
        pull.values(v),
        s,
        pullCompare(v, cb)
      )
      pull(
        s.a,
        s.a
      )
    })

    it('moves data from i to b to o', cb => {
      const s = redir.duplex()

      s.changeDest('b')

      pull(
        pull.values(v),
        s,
        pullCompare(v, cb)
      )
      pull(
        s.b,
        s.b
      )
    })

    it('moves half the data from i to a to o and the other half from i to b to o', cb => {
      const s = redir.duplex()
      let i = 0

      pull(
        pull.values(v),
        s,
        pullCompare(v, cb)
      )

      pull(
        s.a,
        pull.map(v => {
          i++
          if (i === 2) s.changeDest('b')
          return v
        }),
        s.a
      )

      pull(
        s.b,
        s.b
      )
    })
  })
})
