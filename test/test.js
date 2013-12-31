
'use strict'

var async = require('async')
var should = require('should')
var testModule = require('../test-module')
var moduleLib = require('../lib/export')

var expectedComponents = [
  'test component 0',
  'test component 11',
  'test component 12',
  'test component 21',
  'test component 22',
  'test component 3',
  'test component 4',
]

var componentListToTable = function(components) {
  var table = { }

  components.forEach(function(component) {
    table[component.name] = component
  })

  return table
}

describe('integrated module test', function() {
  it('should load all modules', function(callback) {
    moduleLib.loadComponentsFromQuiverModule(testModule.quiverModule, 
      function(err, quiverComponents) {
        if(err) console.log(err)
        if(err) return callback(err)

        var componentTable = componentListToTable(quiverComponents)

        expectedComponents.forEach(function(componentName) {
          should.exists(componentTable[componentName])
        })

        callback()
      })
  })
})