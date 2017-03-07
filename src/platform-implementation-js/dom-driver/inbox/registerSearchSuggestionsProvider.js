/* @flow */

import type InboxDriver from './inbox-driver';

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import toItemWithLifetimeStream from '../../lib/toItemWithLifetimeStream';
import searchBarParser from './detection/searchBar/parser';

export default function registerSearchSuggestionsProvider(driver: InboxDriver, handler: Function) {
  const stopper = kefirStopper();

  toItemWithLifetimeStream(driver.getTagTree().getAllByTag('searchBar'))
    .flatMap(({el, removalStream}) => {
      const {searchInput} = searchBarParser(el.getValue()).elements;
      if (searchInput) {
        return Kefir.constant({searchInput, removalStream});
      } else {
        return Kefir.never();
      }
    }).flatMap(({searchInput, removalStream}) => {
      const inputs = Kefir.fromEvents(searchInput, 'input').takeUntilBy(removalStream);

      let searchAutocompleteResults: any = kefirBus();
      toItemWithLifetimeStream(driver.getTagTree().getAllByTag('searchAutocompleteResults'))
        .takeUntilBy(removalStream)
        .onValue(item => {
          if (!searchAutocompleteResults.value) {
            searchAutocompleteResults = kefirBus();
          }
          searchAutocompleteResults.value(item);
          searchAutocompleteResults.end();
          searchAutocompleteResults = Kefir.constant(item);
          item.removalStream.onValue(() => {
            searchAutocompleteResults = kefirBus();
          });
        });

      return inputs.flatMap(event => (
        searchAutocompleteResults
          .take(1)
          .map(({el, removalStream}) => ({
            event,
            item: {el, removalStream: removalStream.merge(inputs).take(1)}
          }))
      ))
    })
    .takeUntilBy(stopper).onValue(({event, item: {el: resultsNode, removalStream}}) => {
      const suggestionsElement = document.createElement('div');

      resultsNode.getValue().appendChild(suggestionsElement);

      suggestionsElement.textContent = event.target.value;

      removalStream.onValue(() => suggestionsElement.remove());
    });

  return () => stopper.destroy();
}
