'use strict'

const Pushable = require('pull-pushable')
const EE = require('events').EventEmitter

class CommonStream extends EE {
  constructor (CL) {
    super()
    this.a = new CL(this, 'a')
    this.b = new CL(this, 'b')
    this.dest = 'a'
    this.in = Pushable()
    this.out = Pushable()
  }
  changeDest(d) {
    this.dest = d
    this.emit('switch', d)
  }
}

class CommonSub {
  constructor (main, id) {
    this.main = main
    this.id = id
  }
}

module.exports = {
  CommonStream,
  CommonSub
}
