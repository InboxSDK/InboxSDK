const _ = require('lodash');
const Bacon = require('baconjs');
const fromEventTargetCapture = require('../../../lib/from-event-target-capture');
const simulateClick = require('../../../lib/dom/simulate-click');
const makeElementChildStream = require('../../../lib/dom/make-element-child-stream');
const RSVP = require('rsvp');
const logger = require('../../../lib/logger');
const makeMutationObserverChunkedStream = require('../../../lib/dom/make-mutation-observer-chunked-stream');
const gmailElementGetter = require('../gmail-element-getter');

module.exports = function registerSearchSuggestionsProvider(driver, handler) {
  // We inject the app-provided suggestions into Gmail's AJAX response. Then we
  // watch the DOM for our injected suggestions to show up and attach click and
  // enter handlers to them to let them do custom actions.

  const id = 'inboxsdk__suggestions_'+(''+Date.now()+Math.random()).replace(/\D+/g,'');
  const pageCommunicator = driver.getPageCommunicator();
  pageCommunicator.announceSearchAutocompleter();

  // Listen for the AJAX requests, call the application's handler function, and
  // give the application's suggestions back to the pageCommunicator for it to
  // inject into the AJAX responses.
  pageCommunicator.ajaxInterceptStream
    .filter((event) => event.type === 'suggestionsRequest')
    .map('.query')
    .flatMapLatest((query) =>
      Bacon.fromPromise(RSVP.Promise.resolve(handler(query)), true)
        .flatMap((suggestions) => {
          try {
            // Strip out anything not JSONifiable.
            suggestions = JSON.parse(JSON.stringify(suggestions));

            if (!Array.isArray(suggestions)) {
              throw new Error("suggestions must be an array");
            }
            for (let suggestion of suggestions) {
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
            return new Bacon.Error(e);
          }
          return Bacon.once(suggestions);
        })
        .mapError((err) => {
          logger.error(err);
          return [];
        })
        .doAction((suggestions) => {
          suggestions.forEach((suggestion) => {suggestion.owner = id;});
        })
        .map((suggestions) => ({query, suggestions}))
    )
    .onValue((event) => {
      pageCommunicator.provideAutocompleteSuggestions(event.query, event.suggestions);
    });

  // Wait for the first routeViewDriver to happen before looking for the search box.
  const searchBoxStream = driver.getRouteViewDriverStream().startWith(null)
    .map(() => gmailElementGetter.getSearchInput())
    .filter(Boolean)
    .take(1).toProperty();

  // Wait for the search box to be focused before looking for the suggestions box.
  const suggestionsBoxTbodyStream = searchBoxStream
    .flatMapLatest((searchBox) => Bacon.fromEventTarget(searchBox, 'focus'))
    .map(() => gmailElementGetter.getSearchSuggestionsBoxParent())
    .filter(Boolean)
    .flatMapLatest(makeElementChildStream)
    .map('.el.firstElementChild')
    .take(1).toProperty();

  // This stream emits an event after every time Gmail changes the suggestions
  // list.
  const suggestionsBoxGmailChanges = suggestionsBoxTbodyStream
    .flatMap((suggestionsBoxTbody) =>
      makeMutationObserverChunkedStream(suggestionsBoxTbody, {childList:true}).startWith(null)
    ).map(null);

  // We listen to the event on the document node so that the event can be
  // canceled before Gmail receives it.
  const suggestionsBoxEnterPresses = searchBoxStream
    .flatMap((searchBox) =>
      fromEventTargetCapture(document, 'keydown')
        .filter((event) => event.keyCode == 13 && event.target === searchBox)
    );

  // Stream of arrays of row elements belonging to this provider.
  const providedRows = suggestionsBoxTbodyStream
    .sampledBy(suggestionsBoxGmailChanges)
    .map(suggestionsBoxTbody =>
      _.toArray(suggestionsBoxTbody.children).filter(row => row.getElementsByClassName(id).length > 0)
    );

  providedRows.onValue(rows => {
    if (rows[0] && rows[0].previousElementSibling) {
      rows[0].previousElementSibling.firstElementChild.classList.add(
        'inboxsdk__suggestions_separator_before');
      rows[0].firstElementChild.classList.add(
        'inboxsdk__suggestions_separator_after');
    }
  });

  const rowSelectionEvents = providedRows.flatMapLatest(rows =>
    Bacon.mergeAll(rows.map(row =>
      Bacon.mergeAll(
        fromEventTargetCapture(row, 'click'),
        suggestionsBoxEnterPresses
          .filter(() => row.classList.contains('gssb_i'))
      ).map(event => ({event, row}))
    ))
  );

  Bacon.combineAsArray(rowSelectionEvents, searchBoxStream)
    .onValue(([{event, row}, searchBox]) => {
      const itemDataSpan = row.querySelector('span[data-inboxsdk-suggestion]');
      const itemData = itemDataSpan && JSON.parse(itemDataSpan.getAttribute('data-inboxsdk-suggestion'));
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
};
