'use strict'

/* const pull = require('pull-stream')
const Pushable = require('pull-pushable') */

const debug = require('debug')
const log = debug('pull-redirectable')

const EvEm = require('events').EventEmitter

class EE extends EvEm {
  constructor () {
    super()
    this.harden('harden')
    this.queue_ev = {}
  }
  harden (fnc) {
    if (Array.isArray(fnc)) return fnc.forEach(this.harden)
    this[fnc] = this[fnc].bind(this)
  }
  queueEvents (ev) {
    this.queue_ev[ev] = []
    this.on('ev', (...data) => this.queue_ev[ev].push(data))
  }
  unqueueEvents (ev, l) {
    this.removeAllListeners(ev)
    this.on(ev, l)
    this.queue_ev[ev].forEach(data => this.emit(ev, ...data))
    delete this.queue_ev[ev]
  }
}

class RedirStream extends EE {
  constructor () {
    super()
    this.dest = 'a'
  }
  switchRails (to) {
    this.emit('switchrails', this.dest, to)
    this.dest = to
  }
  switchRailsAfterN (n, to) {

  }
  broadcast (ev, ...args) {
    this.emit('a', ev, ...args)
    this.emit('b', ev, ...args)
  }
}

class RedirStreamSub extends EE {
  constructor (main, id) {
    super()
    this.main = main
    this.id = id
    main.on(id, (...args) => this._emit(...args))
    this._emit = this.emit
    this.emit = (ev, ...args) => {
      main.emit(id, ev, ...args)
      main.emit(ev, id, ...args)
    }
  }
}

class RedirSourceSub extends RedirStreamSub {
  constructor (main, id) {
    super(main, id)
    this.harden('source')
    log('source[%s]: create', id)
  }
  source (end, cb) {
    log('source[%s]: wantdata, end %s', this.id, end)
    this.once('getdata', (...args) => {
      this._waiting = false
      log('source[%s]: getdata satisfied', this.id)
      cb(...args)
    })
    this.emit('wantdata', end, cb)
    this._waiting = true
  }
}

class RedirSource extends RedirStream {
  constructor () {
    super()
    this.a = new RedirSourceSub(this, 'a')
    this.b = new RedirSourceSub(this, 'b')
    this.harden('sink')
    this.on('gotdata', (data) => {
      log('source: gotdata, emit to source[%s]', this.dest)
      this.emit(this.dest, 'getdata', null, data)
    })
    this.queueEvents('wantdata')
    log('source: create')
  }
  end (end, data) {
    log('source: ending %s', end)
    this.broadcast('getdata', end, data)
    this._ended = [end, data]
  }
  sink (read) { // we get the readable function
    log('source: initialized readable')
    const next = (end, data) => {
      log('source(read): end=%s data=%s', end, !!data)
      if (end) {
        return this.end(end, data)
      }
      this.emit('gotdata', data)
    }
    this.unqueueEvents('wantdata', (id, end, cb) => {
      if (this._ended) return this.emit(id, 'getdata', ...this._ended)
      const _do = (this.dest == id || !end)
      log('source: get wantdata source[%s], ignore %s', id, !_do)
      if (end) {
        if ((end === true && id === 'b') || end !== true) {
          log('source: ending stream')
          this.end(end, null)
          return read(end)
        } else if (end === true) {
          log('source: ending dest source[%s]', id)
          this.emit(id, 'getdata', end)
        }
      } else {
        log('source: read')
        read(null, next)
      }
    })
  }
}

module.exports = {
  source: () => new RedirSource()
}
