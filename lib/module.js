
'use strict'

var async = require('async')
var pathLib = require('path')
var error = require('quiver-error').error
var componentLib = require('quiver-component')
var safeCallback = require('quiver-safe-callback').safeCallback

module.exports = function(nodeRequire) {
  var requireAsync = function(sourcePath, callback) {
    callback = safeCallback(callback)

    try {
      var module = nodeRequire(sourcePath)
      var modulePath = nodeRequire.resolve(sourcePath)
    } catch(err) {
      console.trace(err)
      return callback(error(500, 
        'error loading source file ' + sourcePath, err))
    }

    callback(null, module, modulePath)
  }

  var createCacheModuleLoader = function(moduleLoader) {
    var cachedModule = null
    var loadCallbacks = []

    var allCallback = function(err, module) {
      var callbacks = loadCallbacks
      loadCallbacks = []

      callbacks.forEach(function(callback) {
        callback(err, module)
      })
    }

    var cachedLoader = function(callback) {
      callback = safeCallback(callback)

      if(cachedModule) return callback(null, cachedModule)

      loadCallbacks.push(callback)
      if(loadCallbacks.length > 1) return 

      moduleLoader(function(err, module) {
        if(err) return allCallback(err)

        cachedModule = module
        allCallback(null, module)
      })
    }

    return cachedLoader
  }

  var loadQuiverModule = function(moduleName, componentDir, dependencies, callback) {
    componentLib.loadComponentsFromDirectory(componentDir, function(err, quiverComponents) {
      if(err) return callback(err)

      var componentDependencies = [ ]
      var packageNames = Object.keys(dependencies)
      async.each(packageNames, function(packageName, callback) {
        requireAsync(packageName, function(err, nodeModule) {
          if(err) return callback(err)

          if(nodeModule.quiverModule) {
            componentDependencies.push({
              name: packageName,
              quiverModule: nodeModule.quiverModule
            })
          }

          callback()
        })
      }, function(err) {
        if(err) return callback(err)

        var module = {
          name: moduleName,
          quiverComponents: quiverComponents,
          dependencies: componentDependencies
        }

        callback(null, module)
      })
    })
  }

  var exportFromManifest = function(manifestPath) {
    var quiverModule = function(callback) {
      requireAsync(manifestPath, function(err, manifest, manifestFullPath) {
        if(err) return callback(err)

        var basePath = pathLib.join(manifestFullPath, '..')

        var relativeComponentPath = manifest.quiverComponent || 'component'
        var componentPath = pathLib.join(basePath, relativeComponentPath)

        var dependencies = manifest.dependencies || { }

        loadQuiverModule(manifest.name, componentPath, dependencies, callback)
      })
    }

    return createCacheModuleLoader(quiverModule)
  }

  var exports = {
    createCacheModuleLoader: createCacheModuleLoader,
    loadQuiverModule: loadQuiverModule,
    exportFromManifest: exportFromManifest
  }

  return exports
}