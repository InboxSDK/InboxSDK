/* @flow */

import type InboxDriver from './inbox-driver';

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import toItemWithLifetimeStream from '../../lib/toItemWithLifetimeStream';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';
import insertElementInOrder from '../../lib/dom/insert-element-in-order';
import searchBarParser from './detection/searchBar/parser';
import closest from 'closest-ng';
import autoHtml from 'auto-html';

import type {AutocompleteSearchResult} from '../../../injected-js/gmail/modify-suggestions';

const ORDERING_ATTR = 'data-inboxsdk-search-provider-count';
const DEFAULT_RESULT_ICON = '//www.gstatic.com/images/icons/material/system/2x/search_black_24dp.png';

const getProviderOrder = () => {
  const {documentElement} = document;
  if (!documentElement) { throw new Error(); }
  const orderAttr = documentElement.getAttribute(ORDERING_ATTR);
  const providerOrder = (orderAttr ? parseInt(orderAttr) + 1 : 0).toString();

  documentElement.setAttribute(ORDERING_ATTR, providerOrder);

  return providerOrder;
};

const handleResultChosen = ({driver, searchInput, result, event}) => {
  if (typeof result.onClick === 'function') {
    result.onClick();
  }

  if (typeof result.externalURL === 'string') {
    window.open(result.externalURL);
  }

  if (result.routeName && result.routeParams) {
    driver.goto(result.routeName, result.routeParams);
  }

  if (typeof result.searchTerm === 'string') {
    searchInput.value = result.searchTerm;
    searchInput.dispatchEvent(new Event('input'));
  }
};

const renderResultsList = ({
  driver,
  searchInput,
  removalStream,
  results,
  providerOrder
}) => {
  const container = document.createElement('div');

  container.setAttribute('data-order-hint', providerOrder);
  container.classList.add('inboxsdk__search_suggestion_group');

  results.forEach(result => {
    const listItem = document.createElement('li');

    const description = result.description || result.descriptionHTML ? autoHtml `
      <span class="inboxsdk__search_suggestion_desc">
        ${result.description || {__html: result.descriptionHTML}}
      </span>
    ` : '';

    listItem.classList.add('inboxsdk__search_suggestion');
    listItem.innerHTML = autoHtml `
      <img src="${result.iconUrl || DEFAULT_RESULT_ICON}">
      <span>
        <span class="inboxsdk__search_suggestion_name" role="option">
          ${result.name || {__html: result.nameHTML}}
        </span>
        ${{__html: description}}
      </span>
    `;

    Kefir.fromEvents(listItem, 'click')
      .takeUntilBy(removalStream)
      .onValue((event: MouseEvent) => (
        handleResultChosen({driver, searchInput, result, event})
      ));

    container.appendChild(listItem);
  });

  return container;
};

export default function registerSearchSuggestionsProvider(
  driver: InboxDriver,
  handler: (string) => Promise<Array<AutocompleteSearchResult>>
) {
  const stopper = kefirStopper();
  const providerOrder = getProviderOrder();

  toItemWithLifetimeStream(driver.getTagTree().getAllByTag('searchBar'))
    .flatMap(({el, removalStream}) => {
      const {searchInput} = searchBarParser(el.getValue()).elements;
      if (searchInput instanceof HTMLInputElement) {
        return Kefir.constant({
          searchInput,
          searchInputRemovalStream: removalStream
        });
      } else {
        return Kefir.never();
      }
    }).flatMap(({searchInput, searchInputRemovalStream}) => (
      toItemWithLifetimeStream(driver.getTagTree().getAllByTag('searchAutocompleteResults'))
        .takeUntilBy(searchInputRemovalStream)
        .map(({el, removalStream}) => ({
          searchInput,
          searchInputRemovalStream,
          resultsEl: el.getValue(),
          resultsElRemovalStream: removalStream
        }))
    )).flatMap(({searchInput, searchInputRemovalStream, resultsEl, resultsElRemovalStream}) => {
      const inputs = Kefir.fromEvents(searchInput, 'input')
        .takeUntilBy(searchInputRemovalStream)
        .takeUntilBy(resultsElRemovalStream);

      return inputs.map((event) => ({
        event,
        searchInput,
        resultsEl,
        inputStream: inputs
      }));
    }).flatMapLatest((item) => {
      const suggestionsResponse = Kefir.fromEvents(document, 'inboxSDKajaxIntercept')
        .filter(({detail: {type}}) => type === 'searchSuggestionsReceieved');

      const searchResultsContainer = closest(item.resultsEl, 'div[jsaction]');

      if (!(searchResultsContainer instanceof HTMLElement)) { throw new Error(); }

      // Inbox removes the entire search UI subtree from the document whenever
      // the user navigates away from search, and re-inserts the same subtree
      // when the user navigates back to search. As a result the only way we
      // can cleanup our modifications when the user leaves search is to
      // detect this subtree removal via observation of the subtree's parent.
      const searchResultsRemoved = makeMutationObserverChunkedStream(
        searchResultsContainer,
        {childList: true}
      ).filter(() => !(closest(item.resultsEl, 'div[jsaction] > div')));

      const removalStream = Kefir.merge([
        // Handle cleanup when a new search query is entered. We want to wait
        // to remove our old results until *after* Inbox's results from the new
        // query have come back, since that will allow our modifications to
        // switch from old -> new in sync with Inbox's native suggestions.
        // If we didn't wait on `suggestionsResponse` to trigger cleanup,
        // Our modifications would disappear the moment the user started typing,
        // which ends up looking jarring and inconsistent with Inbox's results
        // which stick around until the new results are ready.
        item.inputStream.take(1).flatMap(() => suggestionsResponse),

        // Handle cleanup when the user deletes their entire search query.
        item.inputStream.filter(({target: {value}}) => value === ''),
        searchResultsRemoved
      ]).take(1);

      return Kefir.combine([
        Kefir.fromPromise(Promise.resolve(handler(item.event.target.value))),
        // Wait to send results to the UI until Inbox's results have come back
        // to avoid rendering too soon.
        suggestionsResponse.take(1)
      ]).takeUntilBy(removalStream).map((
        [results]: [Array<AutocompleteSearchResult>]
      ) => ({
        ...item,
        removalStream,
        results
      }));
    }).takeUntilBy(stopper).flatMap(({
      resultsEl,
      searchInput,
      removalStream,
      results
    }) => {
      try {
        if (!Array.isArray(results)) {
          throw new Error('suggestions must be an array');
        }

        const validatedResults = results.map(result => {
          const resultCopy = {...result};
          if (
            typeof resultCopy.name !== 'string' &&
            typeof resultCopy.nameHTML !== 'string'
          ) {
            throw new Error('suggestion must have name or nameHTML property');
          }
          if (
            typeof resultCopy.routeName !== 'string' &&
            typeof resultCopy.externalURL !== 'string' &&
            typeof resultCopy.searchTerm !== 'string' &&
            typeof resultCopy.onClick !== 'function'
          ) {
            throw new Error(
              'suggestion must have routeName, externalURL, ' +
              'searchTerm, or onClick property'
            );
          }
          if (typeof resultCopy.iconURL === 'string') {
            const iconURL = resultCopy.iconURL;
            driver.getLogger().deprecationWarning(
              'AutocompleteSearchResult "iconURL" property',
              'AutocompleteSearchResult.iconUrl'
            );
            if (!resultCopy.iconUrl) {
              if (driver.getOpts().REQUESTED_API_VERSION === 1) {
                resultCopy.iconUrl = iconURL;
              } else {
                console.error(
                  'Support for iconURL property was dropped after API version 1'
                );
              }
            }
            delete resultCopy.iconURL;
          }
          return resultCopy;
        });

        return Kefir.constant({
          resultsEl,
          searchInput,
          removalStream,
          results: validatedResults
        });
      } catch (error) {
        return Kefir.constantError(error);
      }
    }).filter(({results}) => results.length > 0).onError(error => (
      driver.getLogger().error(error)
    )).onValue(({resultsEl, searchInput, removalStream, results}) => {
      const suggestionsElement = renderResultsList({
        driver,
        searchInput,
        removalStream,
        results,
        providerOrder
      });

      insertElementInOrder(resultsEl, suggestionsElement);

      // When we want to show results for a search term but Inbox doesn't have
      // any results, we need to force the results element to be displayed.
      // When Inbox hides the element it also removes a class that applies
      // some padding adjustments, so we have to force that as well.
      resultsEl.style.display = 'block';
      resultsEl.style.padding = '6px 0';

      removalStream.onValue(() => suggestionsElement.remove());

      // When Inbox gets the *first* set of suggestions after opening search,
      // it clears away the current children of the `resultsEl` element.
      // When this happens, our modifications will get cleared away if
      // we've already added them — this can happen if Inbox skips a turn of
      // the event loop between getting the AJAX response back and rendering to
      // the DOM. To handle this case, we watch `resultsEl` for mutations
      // and re-add our modifications if they've been cleared.
      // We also force `resultsEl` to show because the first time
      // we display modifications that aren't accompanied by native results
      // Inbox hides `resultsEl` after we force it to show. Because Inbox
      // removes the previous search's results in the same event loop tick as
      // hiding `resultsEl`, we can hook into the child element removal and
      // re-show it before the hidden state gets painted to the screen.
      makeMutationObserverChunkedStream(resultsEl, {childList: true})
        .takeUntilBy(removalStream)
        .onValue(() => {
          resultsEl.style.display = 'block';
          if (suggestionsElement.parentElement !== resultsEl) {
            insertElementInOrder(resultsEl, suggestionsElement);
          }
        });
    });

  return () => stopper.destroy();
}
