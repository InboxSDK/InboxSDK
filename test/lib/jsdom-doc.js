/* @flow */
//jshint ignore:start

const jsdom = require('jsdom');

jsdom.defaultDocumentFeatures = {
  FetchExternalResources: false,
  ProcessExternalResources: false
};

export default function jsdomDoc(html: string): Document {
  const document: Document = (jsdom.jsdom(html): any);
  return document;
}
