/* @flow */
//jshint ignore:start

const jsdom = require('jsdom');

export default function jsdomDoc(html: string): Document {
  const document: Document = (jsdom.jsdom(html, {
    features: {
      FetchExternalResources: false,
      ProcessExternalResources: false
    }
  }): any);
  return document;
}
