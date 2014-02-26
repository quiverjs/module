
'use strict'

var async = require('async')
var should = require('should')
var testModule = require('../test-module')
var moduleLib = require('../lib/module')

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
  it('should load all modules', function() {
    var quiverComponents = moduleLib.loadComponentsFromQuiverModule(
      testModule.quiverModule)

    should.equal(quiverComponents.length, expectedComponents.length)
    
    quiverComponents.forEach(function(component) {
      should.notEqual(expectedComponents.indexOf(component.name), -1)
    })
  })
})