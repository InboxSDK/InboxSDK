/* @flow */

import once from 'lodash/once';
import find from 'lodash/find';
import Kefir from 'kefir';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import {simulateClick} from '../../../lib/dom/simulate-mouse-event';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import RSVP from 'rsvp';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import gmailElementGetter from '../gmail-element-getter';
import copyAndValidateAutocompleteResults from '../../../lib/copyAndValidateAutocompleteResults';

import type GmailDriver from '../gmail-driver';
import type {AutocompleteSearchResult, AutocompleteSearchResultWithId} from '../../../../injected-js/gmail/modify-suggestions';

export default function registerSearchSuggestionsProvider(driver: GmailDriver, handler: Function) {
  // We inject the app-provided suggestions into Gmail's AJAX response. Then we
  // watch the DOM for our injected suggestions to show up and attach click and
  // enter handlers to them to let them do custom actions.

  const providerId = 'inboxsdk__suggestions_'+(''+Date.now()+Math.random()).replace(/\D+/g,'');
  const pageCommunicator = driver.getPageCommunicator();
  pageCommunicator.registerSuggestionsModifier(providerId);

  // Listen for the AJAX requests, call the application's handler function, and
  // give the application's suggestions back to the pageCommunicator for it to
  // inject into the AJAX responses.
  const suggestionsStream = pageCommunicator.ajaxInterceptStream
    .filter((event) => event.type === 'suggestionsRequest')
    .flatMapLatest(({query}) =>
      Kefir.fromPromise(RSVP.Promise.resolve(handler(query)))
        .flatMap((results: Array<AutocompleteSearchResult>) => {
          try {
            const validatedResults = copyAndValidateAutocompleteResults(
              driver,
              results
            );

            const validatedResultsWithIds = validatedResults.map(result => (
              {...result, providerId, id: `${Date.now()}-${Math.random()}`}
            ));

            return Kefir.constant(validatedResultsWithIds);
          } catch(e) {
            return Kefir.constantError(e);
          }
        })
        .mapErrors(err => {
          driver.getLogger().error(err);
          return [];
        })
        .map(suggestions => {
          return {query, suggestions};
        })
    )
    .onValue(event => {
      pageCommunicator.provideAutocompleteSuggestions(providerId, event.query, event.suggestions);
    })
    .map(event => event.suggestions);

  // Wait for the first routeViewDriver to happen before looking for the search box.
  const searchBoxStream: Kefir.Observable<HTMLInputElement> =
    driver.getRouteViewDriverStream()
      .toProperty(() => null)
      .map(() => gmailElementGetter.getSearchInput())
      .filter(Boolean)
      .take(1);

  // Wait for the search box to be focused before looking for the suggestions box.
  const suggestionsBoxTbodyStream: Kefir.Observable<HTMLElement> = searchBoxStream
    .flatMapLatest((searchBox) => Kefir.fromEvents(searchBox, 'focus'))
    .map(() => gmailElementGetter.getSearchSuggestionsBoxParent())
    .filter(Boolean)
    .flatMapLatest(makeElementChildStream)
    .map(x => (x.el:any).firstElementChild)
    .take(1).toProperty();

  // This stream emits an event after every time Gmail changes the suggestions
  // list.
  const suggestionsBoxGmailChanges = suggestionsBoxTbodyStream
    .flatMap((suggestionsBoxTbody) =>
      makeMutationObserverChunkedStream(suggestionsBoxTbody, {childList:true}).toProperty(() => null)
    ).map(() => null);

  // We listen to the event on the document node so that the event can be
  // canceled before Gmail receives it.
  const suggestionsBoxEnterPresses = searchBoxStream
    .flatMap((searchBox) =>
      fromEventTargetCapture(document, 'keydown')
        .filter((event) => event.keyCode == 13 && event.target === searchBox)
    );

  // Stream of arrays of row elements belonging to this provider.
  const providedRows: Kefir.Observable<HTMLElement[]> = suggestionsBoxTbodyStream
    .sampledBy(suggestionsBoxGmailChanges)
    .map(suggestionsBoxTbody =>
      Array.from(suggestionsBoxTbody.children).filter(row => row.getElementsByClassName(providerId).length > 0)
    );

  providedRows.onValue(rows => {
    if (rows[0] && rows[0].previousElementSibling) {
      const prevFirstChild = rows[0].previousElementSibling.firstElementChild;
      if (prevFirstChild) {
        prevFirstChild.classList.add('inboxsdk__suggestions_separator_before');
      }
      const firstChild = rows[0].firstElementChild;
      if (firstChild) {
        firstChild.classList.add('inboxsdk__suggestions_separator_after');
      }
    }
  });

  const rowSelectionEvents: Kefir.Observable<{event: Object, row: HTMLElement}> = providedRows.flatMapLatest(rows =>
    Kefir.merge(rows.map(row =>
      Kefir.merge([
        fromEventTargetCapture(row, 'click'),
        suggestionsBoxEnterPresses
          .filter(() => row.classList.contains('gssb_i'))
      ]).map(event => ({event, row}))
    ))
  );

  const activeSuggestionsStream: Kefir.Observable<Array<AutocompleteSearchResultWithId>> =
    Kefir.merge([
      suggestionsStream,
      searchBoxStream
        .flatMapLatest(searchBox => Kefir.fromEvents(searchBox, 'blur'))
        .map(() => [])
    ]).toProperty();

  Kefir.combine([rowSelectionEvents, searchBoxStream], [activeSuggestionsStream])
    .onValue((
      tuple: any
    ) => {
      const [{event, row}, searchBox, suggestions] = (tuple: [{event: Object, row: HTMLElement}, HTMLInputElement, Array<AutocompleteSearchResultWithId>]);

      const itemDataSpan = row.querySelector('span[data-inboxsdk-suggestion]');
      const itemData = itemDataSpan ? JSON.parse(itemDataSpan.getAttribute('data-inboxsdk-suggestion') || 'null') : null;

      const clearSearch = once(() => {
        event.stopImmediatePropagation();
        event.preventDefault();
        searchBox.blur();
        searchBox.value = "";
      });

      if (itemData) {
        const {id} = itemData;
        const suggestion = find(suggestions, s => s.id === id);
        if (!suggestion) {
          // I can imagine this happening if Gmail caches old suggestions
          // results. Unknown if it does that so let's log. If it does, then
          // activeSuggestionsStream should be changed to have more than just
          // the most recent suggestions.
          driver.getLogger().error(new Error('Failed to find suggestion by id'));
        }
        if (suggestion && suggestion.onClick) {
          clearSearch();
          suggestion.onClick.call(null);
        }
      }
      if (itemData && itemData.routeName) {
        clearSearch();
        driver.goto(itemData.routeName, itemData.routeParams);
      } else if (itemData && itemData.externalURL) {
        clearSearch();
        window.open(itemData.externalURL);
      }
    });
}
