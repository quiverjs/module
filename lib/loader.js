
'use strict'

var async = require('async')
var error = require('quiver-error').error

var loadComponentsFromQuiverModule = function(quiverModule, callback) {
  var loadedModules = { }
  var quiverComponents = [ ]

  var doLoadComponents = function(quiverModule, callback) {
    quiverModule(function(err, module) {
      if(err) return callback(err)

      var moduleName = module.name
      if(!moduleName) return callback(error(400, 'quiver module has no name'))

      loadedModules[moduleName] = true

      var components = module.quiverComponents || []
      quiverComponents = quiverComponents.concat(components)
      var dependencies = module.dependencies || []

      async.eachSeries(dependencies, function(dependency, callback) {
        var moduleName = dependency.name
        if(!moduleName) return callback(error(400, 'module dependency has no name'))

        if(loadedModules[moduleName]) return callback()

        var module = dependency.quiverModule
        if(!module) return callback(error(400, 'module dependency has no quiver module'))

        doLoadComponents(module, callback)
      }, function(err) {
        if(err) return callback(err)

        callback(null, quiverComponents)
      })
    })
  }

  doLoadComponents(quiverModule, callback)
}

module.exports = {
  loadComponentsFromQuiverModule: loadComponentsFromQuiverModule
}