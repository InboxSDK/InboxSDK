/* @flow */

import assert from 'assert';
import RSVP from '../test/lib/rsvp';
import fs from 'fs';

import PageCommunicator from '../src/platform-implementation-js/dom-driver/gmail/gmail-page-communicator';
import * as threadIdentifier from '../src/injected-js/thread-identifier';

document.documentElement.innerHTML = fs.readFileSync(__dirname+'/injected-thread-identifier.html', 'utf8');

test('threadIdentifier works', () => {
  const pageCommunicator = new PageCommunicator();

  threadIdentifier.setup();

  // Identify a regular email
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByDatabase(document.getElementById(':3r')), '14a3481b07c29fcf');

  // Fail to identify an ambiguous email that has no click handler
  const amb = document.getElementById(':3g');
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByDatabase(amb), null);
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByClick(amb), null);

  // Fail to identify another ambiguous email that has no click handler
  const amb2 = document.getElementById(':35');
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByDatabase(amb2), null);
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByClick(amb2), null);

  // Identify an email using its click handler
  let clickedCount = 0;
  amb.addEventListener('click', function(event) {
    clickedCount++;
    const win = window.open('?ui=2&view=btop&ver=v0f5rr5r5c17&search=inbox&th=14a5f1c5ad340727&cvid=1', '_blank');

    // Any errors in the click handler are silenced
    setTimeout(function() {
      const requiredProps = {ctrlKey: true, altKey: false, shiftKey: false, metaKey: true};
      Object.keys(requiredProps).forEach(key => {
        assert.strictEqual((event:any)[key], requiredProps[key]);
      });
      assert(!win.closed && win.focus);
    }, 0);
  });
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByDatabase(amb), null);
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByClick(amb), '14a5f1c5ad340727');
  assert.equal(clickedCount, 1);

  // Identify it again by using the cached value. No clicking allowed.
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByDatabase(amb), '14a5f1c5ad340727');
  assert.equal(clickedCount, 1);

  // Continue to fail to identify the other ambiguous email
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByDatabase(amb2), null);
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByClick(amb2), null);

  // Fail to identify two emails that were edited out of the original VIEW_DATA
  const twi1 = document.getElementById(':42');
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByDatabase(twi1), null);
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByClick(twi1), null);
  const twi2 = document.getElementById(':42-dup');
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByDatabase(twi2), null);
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByClick(twi2), null);

  // Give the first one a click handler and identify it.
  twi1.addEventListener('click', function(event) {
    window.open('?ui=2&view=btop&ver=v0f5rr5r5c17&search=inbox&th=14a0c5f5571b501c&cvid=1', '_blank');
  });
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByClick(twi1), '14a0c5f5571b501c');
  // Make sure that the other one is *not* identifiable by the database. A
  // successful click should not populate the database because it does not handle
  // ambiguous thread rows.
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByDatabase(twi2), null);

  // Fail to identify an email that was edited out of the original VIEW_DATA
  const missing = document.getElementById(':74');
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByDatabase(missing), null);
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByClick(missing), null);

  // Intercept some AJAX data
  threadIdentifier.processThreadListResponse(fs.readFileSync(__dirname+'/injected-thread-identifier-ajax.txt', 'utf8'));

  // Can still identify regular email
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByDatabase(document.getElementById(':4d')), '149bf3ae4702f5a7');

  // Can now identify that missing email
  assert.strictEqual(pageCommunicator.getThreadIdForThreadRowByDatabase(missing), '1477fe06f5924590');
});
