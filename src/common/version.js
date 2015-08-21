/* @flow */
//jshint ignore:start

// This is in its own file so that updates to the version value don't cause a
// reload of everything.

exports.BUILD_VERSION = process.env.VERSION;

if ((module:any).hot) {
  ((module:any).hot.accept());
}
