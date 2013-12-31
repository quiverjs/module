
'use strict'

var fs = require('fs')
var path = require('path')
var async = require('async')
var error = require('quiver-error').error
var copyObject = require('quiver-copy').copyObject
var safeCallback = require('quiver-safe-callback').safeCallback

var requireAsync = function(sourcePath, callback) {
  callback = safeCallback(callback)

  try {
    var module = require(sourcePath)
  } catch(err) {
    return callback(error(500, 
      'error loading source file ' + sourcePath, err))
  }

  callback(null, module)
}

var loadComponentsFromDirectory = function(dirPath, callback) {
  fs.readdir(dirPath, function(err, sourceFiles) {
    if(err) return callback(error(500, 
      'error loading source files in directory ' + dirPath, err))

    async.map(sourceFiles, function(sourceFile, callback) {
      var sourcePath = path.join(dirPath, sourceFile)

      fs.stat(sourcePath, function(err, stats) {
        if(err) return callback(error(500, 
          'error loading source file ' + sourcePath, err))

        if(stats.isDirectory()) {
          return loadComponentsFromDirectory(sourcePath, callback)
        }

        if(!/\.js$/.test(sourceFile)) return callback(null, [])

        requireAsync(sourcePath, function(err, module) {
          if(err) return callback(err)

          var quiverComponents = module.quiverComponents || []
          quiverComponents = quiverComponents.map(function(component) {
            component = copyObject(component)
            component.sourcePath = sourcePath
            return component
          })

          callback(null, quiverComponents)
        })
      })
    }, function(err, componentListList) {
      if(err) return callback(err)

      var quiverComponents = Array.prototype.concat.apply([], componentListList)
      callback(null, quiverComponents)
    })
  })
}

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
  loadComponentsFromDirectory: loadComponentsFromDirectory,
  loadComponentsFromQuiverModule: loadComponentsFromQuiverModule
}