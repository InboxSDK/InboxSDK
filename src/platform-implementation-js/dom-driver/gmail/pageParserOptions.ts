import { PageParserTreeOptions } from 'page-parser-tree';

const pageParserOptions: PageParserTreeOptions = {
  tags: {
    support: {
      ownedBy: ['accountContainer']
    }
  },
  watchers: [
    {
      sources: [null],
      tag: 'accountContainer',
      selectors: ['header[role=banner]', 'div:nth-child(2)', 'div:nth-child(2)']
    },
    {
      sources: ['accountContainer'],
      tag: 'support',
      selectors: ['*', 'div:last-child']
    }
  ],
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
    }
  }
};

export default pageParserOptions;
