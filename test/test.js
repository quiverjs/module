
'use strict'

var async = require('async')
var testModule = require('../test-module')

var quiverModule = testModule.quiverModule

describe('integrated module test', function() {
  it('should load all modules', function(callback) {
    quiverModule(function(err, module) {
      if(err) return callback(err)

      console.log(module)
      async.each(module.dependencies, function(dependency, callback) {
        dependency.quiverModule(function(err, module) {
          if(err) return callback(err)

          console.log(module)
          callback()
        })
      }, callback)
    })
  })
})