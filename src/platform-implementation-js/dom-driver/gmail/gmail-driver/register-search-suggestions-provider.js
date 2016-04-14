/* @flow */
// jshint ignore:start

import _ from 'lodash';
import Kefir from 'kefir';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import simulateClick from '../../../lib/dom/simulate-click';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import RSVP from 'rsvp';
import Logger from '../../../lib/logger';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import gmailElementGetter from '../gmail-element-getter';
import type GmailDriver from '../gmail-driver';

export default function registerSearchSuggestionsProvider(driver: GmailDriver, handler: Function) {
  // We inject the app-provided suggestions into Gmail's AJAX response. Then we
  // watch the DOM for our injected suggestions to show up and attach click and
  // enter handlers to them to let them do custom actions.

  var id = 'inboxsdk__suggestions_'+(''+Date.now()+Math.random()).replace(/\D+/g,'');
  var pageCommunicator = driver.getPageCommunicator();
  pageCommunicator.announceSearchAutocompleter(id);

  // Listen for the AJAX requests, call the application's handler function, and
  // give the application's suggestions back to the pageCommunicator for it to
  // inject into the AJAX responses.
  pageCommunicator.ajaxInterceptStream
    .filter((event) => event.type === 'suggestionsRequest')
    .map(x => x.query)
    .flatMapLatest((query) =>
      Kefir.fromPromise(RSVP.Promise.resolve(handler(query)))
        .flatMap((suggestions) => {
          try {
            // Strip out anything not JSONifiable.
            suggestions = JSON.parse(JSON.stringify(suggestions));

            if (!Array.isArray(suggestions)) {
              throw new Error("suggestions must be an array");
            }
            for (var suggestion of suggestions) {
              if (
                typeof suggestion.name !== 'string' &&
                typeof suggestion.nameHTML !== 'string'
              ) {
                throw new Error("suggestion must have name or nameHTML property");
              }
              if (
                typeof suggestion.routeName !== 'string' &&
                typeof suggestion.externalURL !== 'string' &&
                typeof suggestion.searchTerm !== 'string'
              ) {
                throw new Error("suggestion must have routeName, externalURL, or searchTerm property");
              }
            }
          } catch(e) {
            return Kefir.constantError(e);
          }
          return Kefir.constant(suggestions);
        })
        .mapError((err) => {
          Logger.error(err);
          return [];
        })
        .doAction((suggestions) => {
          suggestions.forEach((suggestion) => {suggestion.owner = id;});
        })
        .map((suggestions) => ({query, suggestions}))
    )
    .onValue((event) => {
      pageCommunicator.provideAutocompleteSuggestions(id, event.query, event.suggestions);
    });

  // Wait for the first routeViewDriver to happen before looking for the search box.
  var searchBoxStream: Kefir.Stream<HTMLInputElement> =
    driver.getRouteViewDriverStream()
      .toProperty(() => null)
      .map(() => gmailElementGetter.getSearchInput())
      .filter(Boolean)
      .take(1);

  // Wait for the search box to be focused before looking for the suggestions box.
  var suggestionsBoxTbodyStream: Kefir.Stream<HTMLElement> = searchBoxStream
    .flatMapLatest((searchBox) => Kefir.fromEvents(searchBox, 'focus'))
    .map(() => gmailElementGetter.getSearchSuggestionsBoxParent())
    .filter(Boolean)
    .flatMapLatest(makeElementChildStream)
    .map(x => (x.el:any).firstElementChild)
    .take(1).toProperty();

  // This stream emits an event after every time Gmail changes the suggestions
  // list.
  var suggestionsBoxGmailChanges = suggestionsBoxTbodyStream
    .flatMap((suggestionsBoxTbody) =>
      makeMutationObserverChunkedStream(suggestionsBoxTbody, {childList:true}).toProperty(() => null)
    ).map(() => null);

  // We listen to the event on the document node so that the event can be
  // canceled before Gmail receives it.
  var suggestionsBoxEnterPresses = searchBoxStream
    .flatMap((searchBox) =>
      fromEventTargetCapture(document, 'keydown')
        .filter((event) => event.keyCode == 13 && event.target === searchBox)
    );

  // Stream of arrays of row elements belonging to this provider.
  var providedRows: Kefir.Stream<HTMLElement[]> = suggestionsBoxTbodyStream
    .sampledBy(suggestionsBoxGmailChanges)
    .map(suggestionsBoxTbody =>
      _.toArray(suggestionsBoxTbody.children).filter(row => row.getElementsByClassName(id).length > 0)
    );

  providedRows.onValue(rows => {
    if (rows[0] && rows[0].previousElementSibling) {
      var prevFirstChild = rows[0].previousElementSibling.firstElementChild;
      if (prevFirstChild) {
        prevFirstChild.classList.add('inboxsdk__suggestions_separator_before');
      }
      var firstChild = rows[0].firstElementChild;
      if (firstChild) {
        firstChild.classList.add('inboxsdk__suggestions_separator_after');
      }
    }
  });

  var rowSelectionEvents: Kefir.Stream<{event: Object, row: HTMLElement}> = providedRows.flatMapLatest(rows =>
    Kefir.merge(rows.map(row =>
      Kefir.merge([
        fromEventTargetCapture(row, 'click'),
        suggestionsBoxEnterPresses
          .filter(() => row.classList.contains('gssb_i'))
      ]).map(event => ({event, row}))
    ))
  );

  Kefir.combine([rowSelectionEvents, searchBoxStream])
    .onValue(([{event, row}, searchBox]) => {
      var itemDataSpan = row.querySelector('span[data-inboxsdk-suggestion]');
      var itemData = itemDataSpan ? JSON.parse(itemDataSpan.getAttribute('data-inboxsdk-suggestion')) : null;
      if (itemData) {
        event.stopImmediatePropagation();
        event.preventDefault();
        searchBox.blur();
        searchBox.value = "";
        if (itemData.routeName) {
          driver.goto(itemData.routeName, itemData.routeParams);
        } else if (itemData.externalURL) {
          window.open(itemData.externalURL);
        }
      }
    });
}
