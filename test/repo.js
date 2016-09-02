/* @flow */

import fs from 'fs';

describe('repo', function() {
  it('has a shrinkwrap', function() {
    fs.statSync(__dirname+'/../npm-shrinkwrap.json');
  });
});
