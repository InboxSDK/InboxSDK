import { PageParserTreeOptions } from 'page-parser-tree';

const pageParserOptions: PageParserTreeOptions = {
  tags: {
    support: {
      ownedBy: ['accountContainer']
    },
    supportMenu: {
      ownedBy: ['support']
    }
  },
  watchers: [],
  finders: {
    accountContainer: {
      fn: root =>
        root.querySelectorAll(
          'header[role=banner] > div:nth-child(2) > div:nth-child(2)'
        )
    },
    support: {
      fn: root =>
        root.querySelectorAll(
          'header[role=banner] > div:nth-child(2) > div:nth-child(2) > div:last-child'
        )
    },
    supportMenu: {
      fn: root =>
        root.querySelectorAll(
          'header[role=banner] div:not([aria-label]):not([data-ogsr-up]) > div:not(.inboxsdk__appButton) > div[data-tooltip] + div[role=menu]'
        )
    }
  }
};

export default pageParserOptions;
