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
  describe('source', () => {
    it('moves data from a to o', cb => {
      const s = redir.sink()

      pull(
        pull.values(v),
        s.a.sink
      )
      pull(
        s.source,
        pullCompare(v, cb)
      )
    })

    it('moves data from b to o', cb => {
      const s = redir.sink()

      s.switchRails('b')

      pull(
        pull.values(v),
        s.b.sink
      )

      pull(
        s.source,
        pullCompare(v, cb)
      )
    })

    it('moves half the data from a to o and the other half from b', cb => {
      const s = redir.sink()
      let i = 0

      pull(
        pull.values(v.slice(0, 2)),
        pull.map(v => {
          i++
          if (i === 2) s.switchRails('b')
          return v
        }),
        s.a.sink
      )

      pull(
        pull.values(v.slice(2)),
        s.b.sink
      )

      pull(
        s.source,
        pullCompare(v, cb)
      )
    })
  })
})
