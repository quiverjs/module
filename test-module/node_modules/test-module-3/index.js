
var moduleLib = require('quiver-module')

var quiverModule = moduleLib.exportFromManifest(require, './package.json')

module.exports = {
  quiverModule: quiverModule
}