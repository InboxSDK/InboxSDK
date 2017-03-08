/* @flow */

import type InboxDriver from './inbox-driver';

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import toItemWithLifetimeStream from '../../lib/toItemWithLifetimeStream';
import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';
import searchBarParser from './detection/searchBar/parser';

export default function registerSearchSuggestionsProvider(driver: InboxDriver, handler: Function) {
  const stopper = kefirStopper();

  const getResults = (query) => Kefir.later(1000, 'hello there: ' + query).toPromise();

  toItemWithLifetimeStream(driver.getTagTree().getAllByTag('searchBar'))
    .flatMap(({el, removalStream}) => {
      const {searchInput} = searchBarParser(el.getValue()).elements;
      if (searchInput) {
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

      return inputs.map((event) => ({event, resultsEl, nextInput: inputs}));
    }).flatMapLatest((item) => {
      const modifications = makeMutationObserverChunkedStream(
        item.resultsEl,
        {childList: true, subtree: true, characterData: true}
      );
      const removalStream = item.nextInput.take(1).flatMap(() => modifications).take(1);

      return Kefir.combine([
        Kefir.fromPromise(getResults(item.event.target.value)),
        modifications.take(1)
      ]).takeUntilBy(removalStream).map(([results]) => ({
        ...item,
        removalStream,
        results
      }));
    }).takeUntilBy(stopper).onValue(({event, resultsEl, removalStream, results}) => {
      const suggestionsElement = document.createElement('div');

      console.log('appending suggestions: ', results);
      resultsEl.appendChild(suggestionsElement);

      suggestionsElement.textContent = results;

      removalStream.onValue(() => suggestionsElement.remove());
    });

  return () => stopper.destroy();
}
