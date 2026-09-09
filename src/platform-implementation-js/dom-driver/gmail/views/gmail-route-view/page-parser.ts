import PageParserTree from 'page-parser-tree';
import Logger from '../../../../lib/logger';
import censorHTMLtree from '../../../../../common/censorHTMLtree';
import isNotNil from '../../../../../common/isNotNil';
import type SelectorRegistry from '../../../../lib/dom/selectorRegistry';

export function makePageParser(
  element: HTMLElement,
  logger: Logger,
  selectors: SelectorRegistry,
) {
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
          {
            $map: () =>
              selectors.querySelectorByKey(document, 'routeView.rowListWrapper')
                ?.parentElement,
          },
        ],
      },
      {
        sources: ['rowListElementContainer'],
        tag: 'rowListElement',
        selectors: [
          // `.bGI.nH` stays literal here: this is a descent path, and a
          // registry key resolves a single element rather than a path step.
          { $or: [[], ['.bGI.nH', '.bf5', '.bv9', '.bGC']] },
          '.bGI[role=main]',
          '[gh=tl]',
        ],
      },
    ],
    finders: {
      rowListElementContainer: {
        fn: (root) =>
          [
            selectors.querySelectorByKey(root, 'routeView.rowListWrapper')
              ?.parentElement,
          ].filter(isNotNil),
      },
      rowListElement: {
        fn: (root) => root.querySelectorAll('[gh=tl]'),
      },
    },
  });
}
