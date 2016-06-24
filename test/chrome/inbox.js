/* @flow */
/*:: declare var browser; */

import signIn from './lib/signIn';
import fs from 'fs';

describe('stuff', function() {
  it('works', function() {
    signIn();
    browser.execute('console.log("blah", 123)');
    browser.debug();
  });
});
