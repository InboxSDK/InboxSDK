/* @flow */

import type {Driver} from '../../src/platform-implementation-js/driver-interfaces/driver';
import _makePageParserTree from '../../src/platform-implementation-js/dom-driver/inbox/makePageParserTree';
import type PageParserTree from 'page-parser-tree';

const activePageParserTrees = [];
beforeEach(() => {
  if (activePageParserTrees.length) {
    throw new Error(`activePageParserTrees.length ${activePageParserTrees.length}`);
  }
});
afterEach(() => {
  activePageParserTrees.forEach(page => {
    page.dump();
  });
  activePageParserTrees.length = 0;
});

export default function makePageParserTree(driver: ?Driver, root: Document|HTMLElement): PageParserTree {
  const page = _makePageParserTree(driver, root);
  activePageParserTrees.push(page);
  return page;
}
