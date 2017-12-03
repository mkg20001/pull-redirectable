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
    it('moves data from i to a', cb => {
      const s = redir.source()

      pull(
        pull.values(v),
        s.sink
      )
      pull(
        s.a.source,
        pullCompare(v, cb)
      )
    })

    it('moves data from i to b', cb => {
      const s = redir.source()

      s.changeDest('b')

      pull(
        pull.values(v),
        s.sink
      )

      pull(
        s.b.source,
        pullCompare(v, cb)
      )
    })

    it('moves half the data from i to a and the other half to b', cb => {
      const s = redir.source()
      let i = 0

      pull(
        pull.values(v),
        s.sink
      )

      pull(
        s.a.source,
        pull.map(v => {
          i++
          if (i === 2) s.changeDest('b')
          return v
        }),
        pullCompare(v.slice(0, 2))
      )

      pull(
        s.b.source,
        pullCompare(v.slice(2), cb)
      )
    })
  })
})
