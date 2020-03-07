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
    support: {
      fn(root) {
        return root.querySelectorAll('.gb_se.gb_qe');
      }
    }
  }
};

export default pageParserOptions;
