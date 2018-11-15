/* @flow */

import fs from 'fs';

it('has a yarn lockfile', () => {
  fs.statSync(__dirname+'/../yarn.lock');
});
