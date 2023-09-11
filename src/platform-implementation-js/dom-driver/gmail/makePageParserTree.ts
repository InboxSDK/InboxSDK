import { Driver } from '../../driver-interfaces/driver';
import PageParserTree, { PageParserTreeOptions } from 'page-parser-tree';
import * as Kefir from 'kefir';
import udKefir from 'ud-kefir';
import pageParserOptions from './pageParserOptions';
import censorHTMLtree from '../../../common/censorHTMLtree';

const pageParserOptionsStream: Kefir.Observable<any, any> = udKefir(
  module,
  pageParserOptions,
);

export default function makePageParserTree(
  driver: Driver | null,
  root: Document | HTMLElement,
): PageParserTree {
  const _driver = driver;

  function transformOptions(pageParserOptions: PageParserTreeOptions) {
    return !_driver
      ? pageParserOptions
      : {
          ...pageParserOptions,
          logError(err: Error, el: undefined | HTMLElement) {
            const details = {
              el,
              html: el ? censorHTMLtree(el) : null,
            };
            _driver.getLogger().errorSite(err, details);
          },
        };
  }

  const page = new PageParserTree(root, transformOptions(pageParserOptions));
  pageParserOptionsStream.changes().onValue((pageParserOptions) => {
    console.log('replacing PageParserTree options');
    page.replaceOptions(transformOptions(pageParserOptions));
  });
  return page;
}
