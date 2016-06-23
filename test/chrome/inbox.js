/* @flow */
/*:: declare var browser; */

describe('stuff', function() {
  it('works', function() {
    browser.url('https://inbox.google.com');
    browser.waitForVisible('input[name=email]', 5000);
    browser.setValue('input[name=email]', 'inboxsdktest@gmail.com');
  });
});
