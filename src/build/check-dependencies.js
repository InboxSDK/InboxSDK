var fs = require('fs');
var _ = require('lodash');
var assert = require('assert');
var semver = require('semver');

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
  var package = require(packagePath.join('/node_modules/')+'/package.json');
  assert.strictEqual(package.version, shrinkWrap.version);
  _.forOwn(shrinkWrap.dependencies, function(shrinkwrapPart, depname) {
    if (!_.contains(optionalDeps, depname)) {
      checkDependenciesRecursive(packagePath.concat([depname]), shrinkwrapPart);
    }
  });
}

function checkDependencies(package) {
  try {
    var shrinkWrapPath = __dirname+'/../../npm-shrinkwrap.json';
    if (fs.existsSync(shrinkWrapPath)) {
      var shrinkWrap = require(shrinkWrapPath);
      checkDependenciesRecursive([__dirname+'/../../'], shrinkWrap);
    } else {
      _.forOwn(package.dependencies, checkDependency);
      _.forOwn(package.devDependencies, checkDependency);
    }
  } catch(e) {
    console.error(
      "Dependencies check failed. To fix, run:\n" +
      "    rm -rf node_modules && npm install"
    );
    throw e;
  }
}

module.exports = checkDependencies;
