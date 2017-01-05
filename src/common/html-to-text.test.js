/* @flow */

import htmlToText from './html-to-text';

test('works', () => {
  expect(htmlToText('foo &gt; &amp;gt; <br> <b>foooo</b> aa'))
    .toBe('foo > &gt;  foooo aa');
});
