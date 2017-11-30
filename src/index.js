'use strict'

//TODO: rewrite this as soon as I figure out how to do that better

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
      this._emit(ev, ...args)
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

class RedirSinkSub extends RedirStreamSub {
  constructor (main, id) {
    super(main, id)
    this.harden('sink')
    this.queueEvents('wantdata')
    log('sink[%s]: create', id)
  }
  sink (read) {
    log('sink[%s]: initialized readable', this.id)
    const next = (end, data) => {
      log('sink[%s](read): end=%s data=%s', this.id, end, !!data)
      if (end) {
        return this.end(end, data)
      }
      this.emit('gotdata', data)
    }
    const id = this.id
    const main = this.main
    this.unqueueEvents('wantdata', (end, cb) => {
      if (main._ended) return this.emit('getdata', ...main._ended)
      const _do = (main.dest == id || !end)
      log('sink[%s]: get wantdata sink, ignore %s', id, !_do)
      if (end) {
        if ((end === true && id === 'b') || end !== true) {
          log('sink[%s]: ending stream', id)
          this.end(end, null)
          return read(end)
        } else if (end === true) {
          log('sink[%s]: ending dest sink', id)
          this.emit(id, 'getdata', end)
        }
      } else {
        log('sink: read')
        read(null, next)
      }
    })
  }
  end (end, data) {
    log('sink[%s]: ending %s', this.id, end)
    this.emit('getdata', end, data)
    this.main._ended = [end, data]
  }
}

class RedirSink extends RedirStream {
  constructor () {
    super()
    this.a = new RedirSinkSub(this, 'a')
    this.b = new RedirSinkSub(this, 'b')
    this.harden('source')
    this.on('gotdata', (id, data) => {
      log('sink: gotdata')
      this.emit('getdata', id, null, data)
    })
    this.queueEvents('wantdata')
    log('sink: create')
  }
  source (end, cb) {
    log('sink: wantdata, end %s', this.id, end)
    this.once('getdata', (...args) => {
      args.shift()
      this._waiting = false
      log('sink: getdata satisfied')
      cb(...args)
    })
    this.emit(this.dest, 'wantdata', end, cb)
    this._waiting = true
  }
}

module.exports = {
  source: () => new RedirSource(),
  sink: () => new RedirSink()
}
