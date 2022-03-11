import { PageParserTreeOptions } from 'page-parser-tree';

const pageParserOptions: PageParserTreeOptions = {
  tags: {},
  watchers: [
    {
      sources: [null],
      tag: 'composeLinkPopOverContainer',
      selectors: ['body', '.Lf.a5s'],
    },
  ],
  finders: {
    supportMenu: {
      fn: (root) =>
        root.querySelectorAll(
          'header[role=banner] div:not([aria-label]):not([data-ogsr-up]) > div:not(.inboxsdk__appButton) > div[data-tooltip] + div[role=menu]'
        ),
    },
    composeLinkPopOverContainer: {
      fn: (root) => root.querySelectorAll('body > .Lf.a5s'),
    },
  },
};

export default pageParserOptions;
