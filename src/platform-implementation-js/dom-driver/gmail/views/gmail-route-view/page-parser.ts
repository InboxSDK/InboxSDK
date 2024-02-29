import PageParserTree from 'page-parser-tree';
import Logger from '../../../../lib/logger';
import censorHTMLtree from '../../../../../common/censorHTMLtree';
import isNotNil from '../../../../lib/isNotNil';

const enum Selector {
  bodyScrollParent = '.nH.bkK',
  rowListContainer = ':has(> .bGI.nH)',
}

export const enum Tag {
  bodyScrollParent = 'bodyScrollParent',
  rowListElementContainer = 'rowListElementContainer',
}

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
        tag: 'bodyScrollParent',
        selectors: [
          {
            $map: () =>
              document.querySelector<HTMLElement>(Selector.bodyScrollParent),
          },
        ],
      },
      {
        sources: [Tag.bodyScrollParent],
        tag: Tag.rowListElementContainer,
        selectors: [
          {
            $map: () =>
              document.querySelector<HTMLElement>(Selector.rowListContainer),
          },
        ],
      },
      {
        sources: [Tag.rowListElementContainer],
        tag: 'rowListElement',
        selectors: [
          { $or: [[], ['.bGI.nH', '.bf5', '.bv9', '.bGC']] },
          '.bGI[role=main]',
          '[gh=tl]',
        ],
      },
    ],
    finders: {
      [Tag.bodyScrollParent]: {
        fn: () =>
          [
            document.querySelector<HTMLElement>(Selector.bodyScrollParent),
          ].filter(isNotNil),
      },
      [Tag.rowListElementContainer]: {
        fn: (root) =>
          [root.querySelector<HTMLElement>(Selector.rowListContainer)].filter(
            isNotNil,
          ),
      },
      rowListElement: {
        fn: (root) => root.querySelectorAll('[gh=tl]'),
      },
    },
  });
}
