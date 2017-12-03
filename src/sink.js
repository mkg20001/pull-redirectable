'use strict'

const pull = require('pull-stream')
const {CommonStream, CommonSub} = require('./common')
const Pushable = require('pull-pushable')

const debug = require('debug')
const log = debug('pull-redirectable:sink')

class RedirSinkSub extends CommonSub {
  constructor (main, id) {
    super(main, id)
    log('[%s]: init', id)
    this.read = this.read.bind(this)
    this.sink = this.sink.bind(this)
    this.in = Pushable()
  }
  sink (read) {
    log('[%s]: got readable', this.id)
    pull(
      this.in,
      pull.asyncMap((data, cb) => {
        // log('[+]: do [%s]', data.id, data)
        read(data.end, (err, res) => {
          if (err) {
            setImmediate(() => data.cb(err))
            return cb(err)
          }
          setImmediate(() => data.cb(err, res))
          return cb()
        })
      }),
      pull.onEnd(err => {
        if (!err) err = true
        log('[%s]: done', this.id, err)
        this.ended = err
      })
    )
  }
  read (end, cb) {
    log('read for [%s]: do', this.id)
    this.in.push({
      end,
      cb
    })
  }
}

class RedirSink extends CommonStream {
  constructor () {
    super(RedirSinkSub)
    log('[+]: init')
    this.source = this.source.bind(this)
  }
  source (end, cb) {
    log('[+]: got read (end=%s)', end)
    this.waiting = (err, res) => {
      log('[+]: got res (end=%s, data=%s)', err, Boolean(res))
      if (err) this.ended = err
      delete this.waiting
      cb(err, res)
    }
    if (this.ended) return this.waiting(this.ended)
    this[this.dest].read(end, this.waiting)
  }
}

module.exports = () => new RedirSink()
