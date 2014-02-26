
'use strict'

var fs = require('fs')
var pathLib = require('path')
var async = require('async')
var error = require('quiver-error').error
var copyObject = require('quiver-copy').copyObject
var safeCallback = require('quiver-safe-callback').safeCallback

var loadComponentsFromDirectorySync = function(dirPath) {
  var sourceFiles = fs.readdirSync(dirPath)

  var componentListList = sourceFiles.map(function(sourceFile) {
    var sourcePath = pathLib.join(dirPath, sourceFile)
    var fileStats = fs.statSync(sourcePath)

    if(fileStats.isDirectory()) {
      return loadComponentsFromDirectorySync(sourcePath)
    }

    if(!/\.js$/.test(sourceFile)) return []
    var module = require(sourcePath)
    var components = module.quiverComponents || []

    return components.map(function(component) {
      component = copyObject(component)
      component.sourcePath = sourcePath
      return component
    })
  })

  var quiverComponents = Array.prototype.concat.apply(
    [], componentListList)

  return quiverComponents
}

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
      var sourcePath = pathLib.join(dirPath, sourceFile)

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

var loadComponentsFromQuiverModule = function(quiverModule) {
  var loadedModules = { }
  var allComponents = [ ]

  var doLoadComponents = function(quiverModule) {

    var moduleName = quiverModule.name
    if(!moduleName || moduleName.length == 0) throw new Error(
      'invalid quiver module name')

    if(loadedModules[moduleName]) return
    loadedModules[moduleName] = true

    var quiverComponents = quiverModule.quiverComponents || []
    allComponents = allComponents.concat(quiverComponents)

    var dependencies = quiverModule.dependencies || []

    dependencies.forEach(function(quiverModule) {
      var dependencyName = quiverModule.name
      if(!dependencyName) throw new Error(
        'module dependency has no name')

      doLoadComponents(quiverModule)
    })
  }

  doLoadComponents(quiverModule)
  return allComponents
}

var loadQuiverComponentsFromPathSync = function(path) {
  var fileStats = fs.statSync(path)
  if(fileStats.isDirectory()) return loadComponentsFromDirectorySync(path)

  var module = require(path)

  if(module.quiverModule) {
    return loadComponentsFromQuiverModuleSync(module.quiverModule)
  } else if(module.quiverComponents) {
    return module.quiverComponents
  } else {
    return []
  }
}

var loadDependenciesSync = function(nodeRequire, dependencies) {
  var loadedDependencies = []

  for(var dependencyName in dependencies) {
    var nodeModule = nodeRequire(dependencyName)

    if(nodeModule.quiverModule) {
      loadedDependencies.push(nodeModule.quiverModule)
    }
  }

  return loadedDependencies
}

var exportFromManifestSync = function(nodeRequire, manifestPath) {
  var manifest = nodeRequire(manifestPath)
  var manifestFullPath = nodeRequire.resolve(manifestPath)
  
  var moduleName = manifest.name
  if(!moduleName) throw new Error(
    'Module manifest must have a name')

  var basePath = pathLib.join(manifestFullPath, '..')
  var relativeComponentPath = manifest.quiverComponent || 'component'

  var componentPath = pathLib.join(basePath, relativeComponentPath)
  var quiverComponents = loadQuiverComponentsFromPathSync(componentPath)

  var manifestDependencies = manifest.dependencies || { }
  var dependencies = loadDependenciesSync(nodeRequire, manifestDependencies)

  var quiverModule = {
    name: moduleName,
    quiverComponents: quiverComponents,
    dependencies: dependencies
  }

  return quiverModule
}

module.exports = {
  loadComponentsFromDirectory: loadComponentsFromDirectory,
  loadComponentsFromDirectorySync: loadComponentsFromDirectorySync,
  loadComponentsFromQuiverModule: loadComponentsFromQuiverModule,
  loadQuiverComponentsFromPathSync: loadQuiverComponentsFromPathSync,
  loadDependenciesSync: loadDependenciesSync,
  exportFromManifestSync: exportFromManifestSync
}