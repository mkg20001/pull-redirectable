'use strict'

const pull = require('pull-stream')
const {CommonStream, CommonSub} = require('./common')

const debug = require('debug')
const log = debug('pull-redirectable:source')

class RedirSourceSub extends CommonSub {
  constructor (main, id) {
    super(main, id)
    log('[%s]: init', id)
    this.read = main.read.bind(main)
    this.source = this.source.bind(this)
  }
  source (end, cb) {
    log('[%s]: got read (end=%s)', this.id, end)
    this.waiting = (err, res) => {
      log('[%s]: got res (end=%s, data=%s)', this.id, err, res)
      if (err) this.ended = err
      delete this.waiting
      cb(err, res)
    }
    this.read(this.id, end, this.waiting)
  }
}

class RedirSource extends CommonStream {
  constructor () {
    super(RedirSourceSub)
    log('[+]: init')
    this.sink = this.sink.bind(this)
  }
  sink (read) {
    log('[+]: got readable')
    pull(
      this.in,
      pull.asyncMap((data, cb) => {
        // log('[+]: do [%s]', data.id, data)
        read(data.end, (err, res) => {
          delete this[data.id].waiting // avoid calling the cb below
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
        log('[+]: done', err)
        this.err = err
        this.read = (id, end, cb) => cb(this.err)
        return read(err, err => {
          ['a', 'b'].map(k => this[k]).filter(s => !s.ended && Boolean(s.waiting)).forEach(s => s.waiting(err))
        })
      })
    )
  }
  read (id, end, cb) {
    if (this.dest === id) {
      log('read for [%s]: do', id)
      this.in.push({
        end,
        cb,
        id
      })
    } else {
      log('read for [%s]: wait for switch', id)
      const on = to => {
        if (to === id) this.read(id, end, cb)
        else this.once('switch', on)
      }
      this.once('switch', on)
    }
  }
}

module.exports = () => new RedirSource()
