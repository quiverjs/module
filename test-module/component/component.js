
'use strict'

var echoHandlerBuilder = function(config, callback) {
  var handler = function(args, inputStreamable, callback) {
    callback(null, inputStreamable)
  }
}

var quiverComponents = [
  {
    name: 'test component 0',
    type: 'stream handler',
    handlerBuilder: echoHandlerBuilder
  }
]

module.exports = {
  quiverComponents: quiverComponents
}