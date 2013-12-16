
'use strict'

var async = require('async')
var pathLib = require('path')
var error = require('quiver-error').error
var componentLib = require('quiver-component')
var safeCallback = require('quiver-safe-callback').safeCallback

var requireAsync = function(require, sourcePath, callback) {
  callback = safeCallback(callback)

  try {
    var module = require(sourcePath)
  } catch(err) {
    return callback(error(500, 
      'error loading source file ' + sourcePath, err))
  }

  callback(null, module)
}
var resolveAsync = function(require, sourcePath, callback) {
  callback = safeCallback(callback)

  try {
    var fullPath = require.resolve(sourcePath)
  } catch(err) {
    return callback(error(500, 
      'error resolving source file ' + sourcePath, err))
  }

  callback(null, fullPath)
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

var loadQuiverModule = function(require, moduleName, componentDir, dependencies, callback) {
  componentLib.loadComponentsFromDirectory(componentDir, function(err, quiverComponents) {
    if(err) return callback(err)

    var componentDependencies = [ ]
    var packageNames = Object.keys(dependencies)
    async.each(packageNames, function(packageName, callback) {
      requireAsync(require, packageName, function(err, nodeModule) {
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

var exportFromManifest = function(require, manifestPath) {
  var quiverModule = function(callback) {
    requireAsync(require, manifestPath, function(err, manifest) {
      if(err) return callback(err)

      resolveAsync(require, manifestPath, function(err, fullPath) {
        if(err) return callback(err)

        var basePath = pathLib.join(fullPath, '..')
        var relativeComponentPath = manifest.quiverComponent || 'component'
        var componentPath = pathLib.join(basePath, relativeComponentPath)

        var dependencies = manifest.dependencies || { }

        loadQuiverModule(require, manifest.name, componentPath, dependencies, callback)
      })
    })
  }

  return createCacheModuleLoader(quiverModule)
}

module.exports = {
  createCacheModuleLoader: createCacheModuleLoader,
  loadQuiverModule: loadQuiverModule,
  exportFromManifest: exportFromManifest
}