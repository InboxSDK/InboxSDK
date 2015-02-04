var fs = require('fs');
var _ = require('lodash');
var rimraf = require('rimraf');
var semver = require('semver');

function checkDependency(version, depname) {
  var depPackage = require(depname+'/package.json');
  if (!semver.satisfies(depPackage.version, version)) {
    throw new Error(
      "Dependency "+depname+" is at version "+depPackage.version+
      ", but "+version+" is required."
    );
  }
}

function fix6to5ifyDep(package) {
  // 6to5ify uses an old version of 6to5-core, but will happily use a newer
  // version if already installed. We just need to force it off of its own old
  // locally installed version first if it has one.
  var to5ifyCoreDepPath = __dirname+'/../../node_modules/6to5ify/node_modules/6to5-core';
  if (!fs.existsSync(to5ifyCoreDepPath)) {
    return;
  }
  var to5ifyCoreDep = require(to5ifyCoreDepPath+'/package.json');
  var to5core = require('6to5-core/package.json');
  if (
    semver.gt(to5core.version, to5ifyCoreDep.version) &&
    !semver.satisfies(to5ifyCoreDep.version, package.dependencies['6to5-core'])
  ) {
    console.warn('fixing 6to5ify/6to5-core dependency');
    rimraf.sync(to5ifyCoreDepPath);
  }
}

function checkDependencies(package) {
  fix6to5ifyDep(package);
  try {
    _.forOwn(package.dependencies, checkDependency);
    _.forOwn(package.devDependencies, checkDependency);
  } catch(e) {
    console.error("Dependencies check failed. Try running `npm install` to fix.");
    throw e;
  }
}

module.exports = checkDependencies;
