/* @flow */

import fs from 'fs';

describe('repo', function() {
  it('has a yarn lockfile', function() {
    fs.statSync(__dirname+'/../yarn.lock');
  });
});
