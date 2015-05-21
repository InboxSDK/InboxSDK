var fs = require('fs');
var _ = require('lodash');
var assert = require('assert');
var semver = require('semver');
var path = require('path');
var escapeShellArg = require('./escape-shell-arg');

var optionalDeps = ['fsevents'];

function checkDependency(version, depname) {
  var depPackage = require(depname+'/package.json');
  if (!semver.satisfies(depPackage.version, version)) {
    throw new Error(
      "Dependency "+depname+" is at version "+depPackage.version+
      ", but "+version+" is required."
    );
  }
}

function checkDependenciesRecursive(packagePath, shrinkWrap) {
  var packageObj = require(packagePath.join('/node_modules/')+'/package.json');
  // Don't check our own version number.
  if (packagePath.length != 1) {
    assert.strictEqual(packageObj.version, shrinkWrap.version);
  }
  _.forOwn(shrinkWrap.dependencies, function(shrinkwrapPart, depname) {
    if (!_.contains(optionalDeps, depname)) {
      checkDependenciesRecursive(packagePath.concat([depname]), shrinkwrapPart);
    }
  });
}

function checkDependencies(packageObj) {
  try {
    var shrinkWrapPath = __dirname+'/../../npm-shrinkwrap.json';
    if (fs.existsSync(shrinkWrapPath)) {
      var shrinkWrap = require(shrinkWrapPath);
      checkDependenciesRecursive([__dirname+'/../../'], shrinkWrap);
    } else {
      _.forOwn(packageObj.dependencies, checkDependency);
      _.forOwn(packageObj.devDependencies, checkDependency);
    }
  } catch(e) {
    var nmDir = path.join(__dirname, '../../node_modules');
    console.error(
      "Dependencies check failed. To fix, run:\n" +
      "    rm -rf "+escapeShellArg(nmDir)+" && npm install"
    );
    throw e;
  }
}

module.exports = checkDependencies;
