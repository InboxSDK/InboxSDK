import PageParserTree from 'page-parser-tree';
import Logger from '../../../../lib/logger';
import censorHTMLtree from '../../../../../common/censorHTMLtree';
import isNotNil from '../../../../../common/isNotNil';

export function makePageParser(element: HTMLElement, logger: Logger) {
  return new PageParserTree(element, {
    logError(err, el) {
      const details = {
        el,
        html: el ? censorHTMLtree(el) : null,
      };
      logger.errorSite(err, details);
    },
    tags: {},
    watchers: [
      {
        sources: [null],
        tag: 'rowListElementContainer',
        selectors: [
          { $map: () => document.querySelector('.bGI.nH')?.parentElement },
        ],
      },
      {
        sources: ['rowListElementContainer'],
        tag: 'rowListElement',
        selectors: [
          { $or: [[], ['.bGI.nH', '.bf5', '.bv9', '.bGC']] },
          '.bGI[role=main]',
          '[gh=tl]',
        ],
      },
    ],
    finders: {
      rowListElementContainer: {
        fn: (root) =>
          [root.querySelector('.bGI.nH')?.parentElement].filter(isNotNil),
      },
      rowListElement: {
        fn: (root) => root.querySelectorAll('[gh=tl]'),
      },
    },
  });
}
