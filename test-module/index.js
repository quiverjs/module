
var moduleLib = require('quiver-module')(require)

var quiverModule = moduleLib.exportFromManifest('./package.json')

module.exports = {
  quiverModule: quiverModule
}