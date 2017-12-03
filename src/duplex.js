'use strict'

const Source = require('./source')
const Sink = require('./sink')
const {CommonStream, CommonSub} = require('./common')

const debug = require('debug')
const log = debug('pull-redirectable:duplex')

class RedirDuplexSub extends CommonSub {
  constructor (main, id) {
    super(main, id)
    log('[%s]: init', id)
  }
  _ () {
    this.source = this.main.src[this.id].source
    this.sink = this.main.sk[this.id].sink
    delete this._
  }
}

class RedirDuplex extends CommonStream {
  constructor () {
    super(RedirDuplexSub)
    log('[+]: init')
    this.src = Source()
    this.sk = Sink()
    this.source = this.sk.source
    this.sink = this.src.sink
    this.a._()
    this.b._()
  }
  changeDest (d, on) {
    if (!on) {
      this.changeDest(d, 'src')
      this.changeDest(d, 'sk')
      return
    }
    this[on].changeDest(d)
  }
}

module.exports = () => new RedirDuplex()
