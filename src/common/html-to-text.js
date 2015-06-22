/* @flow */
//jshint ignore:start

import entities from 'entities';

// This function does about the same as creating a node, setting it to
// have the given HTML, and reading its textContent property, but without
// touching the DOM or introducing an XSS vulnerability.
// If you already have a DOM node with the HTML, just use node.textContent
// instead!
export default function htmlToText(html: string): string {
  return entities.decodeHTML(html.replace(/<[^>]*>?/g, ''));
}
