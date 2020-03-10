import { PageParserTreeOptions } from 'page-parser-tree';

const pageParserOptions: PageParserTreeOptions = {
  tags: {},
  watchers: [],
  finders: {
    supportMenu: {
      fn: root =>
        root.querySelectorAll(
          'header[role=banner] div:not([aria-label]):not([data-ogsr-up]) > div:not(.inboxsdk__appButton) > div[data-tooltip] + div[role=menu]'
        )
    }
  }
};

export default pageParserOptions;
