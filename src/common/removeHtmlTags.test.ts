import { removeHtmlTagsPolicy } from './removeHtmlTags';

test('output never contains <', () => {
  expect(removeHtmlTagsPolicy.createHTML('<')).toBe('');
  expect(removeHtmlTagsPolicy.createHTML('a<b')).toBe('a');
  expect(removeHtmlTagsPolicy.createHTML('a<b<c<d')).toBe('a');
  expect(removeHtmlTagsPolicy.createHTML('a<b>c<d')).toBe('ac');
  expect(removeHtmlTagsPolicy.createHTML('a<<<<b')).toBe('a');
  expect(removeHtmlTagsPolicy.createHTML('a<<<<b>c>d>e')).toBe('ac>d>e');

  expect(
    removeHtmlTagsPolicy.createHTML(
      'String with <b>html</b> &amp; entities &lt;&gt;',
    ),
  ).toBe('String with html &amp; entities &lt;&gt;');
});
