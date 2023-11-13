import type { Driver } from '../driver-interfaces/driver';

export interface AutocompleteSearchResult {
  name?: null | string;
  nameHTML?: null | string;
  description?: null | string;
  descriptionHTML?: null | string;
  routeName?: null | string;
  routeParams?: null | { [ix: string]: string | number };
  externalURL?: null | string;
  searchTerm?: null | string;
  iconUrl?: null | string;
  iconClass?: null | string;
  iconHTML?: null | string;
  onClick?: null | (() => void);
}

export type SearchSuggestionsProvider = (
  query: string,
) => Array<AutocompleteSearchResult> | Promise<Array<AutocompleteSearchResult>>;

export interface SearchQueryRewriter {
  term: string;
  termReplacer(arg?: unknown): string | Promise<string>;
}

export default class Search {
  #driver;

  constructor(appId: string, driver: Driver) {
    this.#driver = driver;
  }

  registerSearchSuggestionsProvider(
    handler: (
      query: string,
    ) =>
      | Array<AutocompleteSearchResult>
      | Promise<Array<AutocompleteSearchResult>>,
  ): void {
    if (typeof handler != 'function') {
      throw new Error('Incorrect arguments');
    }

    this.#driver.registerSearchSuggestionsProvider(handler);
  }

  registerSearchQueryRewriter(rewriter: SearchQueryRewriter) {
    if (
      typeof rewriter.termReplacer != 'function' ||
      typeof rewriter.term != 'string'
    ) {
      throw new Error('Incorrect arguments');
    }

    if (!rewriter.term.match(/^(app|has):/)) {
      throw new Error("Custom search term must begin with 'app:'");
    }

    this.#driver.registerSearchQueryRewriter(rewriter);
  }
}
