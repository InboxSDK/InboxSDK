import { PageParserTreeOptions } from 'page-parser-tree';

const pageParserOptions: PageParserTreeOptions = {
  tags: {
    support: {
      ownedBy: ['accountContainer']
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
    }
  }
};

export default pageParserOptions;
