/* @flow */
//jshint ignore:start

const _ = require('lodash');
const jsdom = require('jsdom');
const assert = require('assert');

jsdom.defaultDocumentFeatures = {
  FetchExternalResources: false,
  ProcessExternalResources: false
};

export default function jsdomDoc(html: string): Document {
  const document: Document = (jsdom.jsdom(html): any);
  return document;
}
