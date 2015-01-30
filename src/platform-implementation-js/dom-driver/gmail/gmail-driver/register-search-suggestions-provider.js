const _ = require('lodash');
const Bacon = require('baconjs');
const fromEventTargetCapture = require('../../../lib/from-event-target-capture');
const simulateClick = require('../../../lib/dom/simulate-click');
const makeElementChildStream = require('../../../lib/dom/make-element-child-stream');
const RSVP = require('rsvp');
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
      Bacon.fromPromise(RSVP.Promise.resolve(handler({query})), true)
        .flatMap((suggestions) => {
          if (Array.isArray(suggestions)) {
            return Bacon.once(suggestions);
          } else {
            console.error("suggestions not an array", suggestions);
            return new Bacon.Error(new Error("suggestions must be an array"));
          }
        })
        .mapError((err) => {
          // TODO log this better
          setTimeout(() => {throw err;}, 0);
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
  const searchBoxStream = driver.getRouteViewDriverStream()
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

  // With the suggestions box and search box
  Bacon.combineAsArray(suggestionsBoxTbodyStream, searchBoxStream)
    // every time Gmail changes the suggestion box
    .sampledBy(suggestionsBoxGmailChanges)
    .flatMapLatest(([suggestionsBoxTbody, searchBox]) =>
      // get all of the suggestions box rows
      Bacon.fromArray(_.toArray(suggestionsBoxTbody.children))
        // that were injected by this extension
        .filter((row) => row.getElementsByClassName(id).length > 0)
        // and listen to click and enter events on them
        .flatMap((row) =>
          Bacon.mergeAll(
            fromEventTargetCapture(row, 'click'),
            suggestionsBoxEnterPresses
              .filter(() => row.classList.contains('gssb_i'))
          ).map((event) => ({event, row, searchBox}))
        )
    )
    .onValue(({event, row, searchBox}) => {
      const itemURLspan = row.querySelector('span[data-inboxsdk-item-url]');
      const itemURL = itemURLspan && itemURLspan.getAttribute('data-inboxsdk-item-url');
      if (itemURL) {
        event.stopImmediatePropagation();
        event.preventDefault();
        searchBox.blur();
        searchBox.value = "";
        if (itemURL.indexOf('#') === 0) {
          window.location = itemURL;
        } else {
          window.open(itemURL);
        }
      }
    });
};
