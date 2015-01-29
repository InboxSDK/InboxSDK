const _ = require('lodash');
const Bacon = require('baconjs');
const fromEventTargetCapture = require('../../../lib/from-event-target-capture');
const simulateClick = require('../../../lib/dom/simulate-click');
const makeElementChildStream = require('../../../lib/dom/make-element-child-stream');
const RSVP = require('rsvp');
const makeMutationObserverChunkedStream = require('../../../lib/dom/make-mutation-observer-chunked-stream');
const gmailElementGetter = require('../gmail-element-getter');

module.exports = function registerSearchAutocompleter(driver, handler) {
  const id = 'inboxsdk__suggestions_'+(''+Date.now()+Math.random()).replace(/\D+/g,'');
  const pageCommunicator = driver.getPageCommunicator();
  pageCommunicator.announceSearchAutocompleter();

  const querySuggestionsStream = pageCommunicator.ajaxInterceptStream
    .filter((event) => event.type === 'suggestionsRequest')
    .map('.query')
    .flatMapLatest((query) =>
      Bacon.fromPromise(RSVP.Promise.resolve(handler({query})), true).delay(1000)
        .doAction((suggestions) => {
          suggestions.forEach((suggestion) => {suggestion.owner = id;});
        })
        .map((suggestions) => ({query, suggestions}))
    );

  querySuggestionsStream.onValue((event) => {
    if (!Array.isArray(event.suggestions)) {
      console.error("autocompleter response must be an array", event.suggestions);
    } else {
      pageCommunicator.provideAutocompleteSuggestions(event.query, event.suggestions);
    }
  });

  // Wait for the first routeViewDriver to happen before looking for the search box.
  const searchBoxStream = driver.getRouteViewDriverStream()
    .map(() => gmailElementGetter.getSearchInput())
    .filter(Boolean)
    .take(1).toProperty();

  const searchValueStream = searchBoxStream
    .flatMap((search) => Bacon.fromEventTarget(search, 'input').startWith(null).map(search))
    .map('.value').toProperty();

  // Wait for the search box to be focused before looking for the suggestions box.
  const suggestionsBoxTbodyStream = searchBoxStream
    .flatMapLatest((searchBox) => Bacon.fromEventTarget(searchBox, 'focus'))
    .map(() => gmailElementGetter.getSearchSuggestionsBoxParent())
    .filter(Boolean)
    .flatMapLatest(makeElementChildStream)
    .map('.el.firstElementChild')
    .take(1).toProperty();

  const suggestionsBoxGmailChanges = suggestionsBoxTbodyStream
    .flatMap((suggestionsBoxTbody) =>
      makeMutationObserverChunkedStream(suggestionsBoxTbody, {childList:true}).startWith(null)
    )
    .filter((changes) => {
      if (changes === null)
        return true;
      for (let change of changes) {
        for (let addedNode of _.toArray(change.addedNodes)) {
          if (addedNode.nodeName === 'TR' && addedNode.getAttribute('role') === 'option')
            return true;
        }
      }
      return false;
    })
    .map(null);

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
        .flatMap((row) => Bacon.mergeAll(
          fromEventTargetCapture(row, 'click'),
          suggestionsBoxEnterPresses
            .filter(() => row.classList.contains('gssb_i'))
        ))
    )
    .combine(searchBoxStream, (a,b) => [a,b])
    .onValue(([event, searchBox]) => {
      event.stopImmediatePropagation();
      event.preventDefault();
      searchBox.blur();
      searchBox.value = "";
      setTimeout(() => alert('custom option selected'), 0);
    });

  // Add separators
  // suggestionsBoxTbodyStream
  //   .sampledBy(suggestionsBoxGmailChanges)
  //   .onValue((suggestionsBoxTbody) => {
  //     for (let child of _.toArray(suggestionsBoxTbody.getElementsByClassName('inboxsdk__custom_suggestion_separator'))) {
  //       console.log('removing separator', new Date());
  //       child.remove();
  //     }
  //     for (let child of _.toArray(suggestionsBoxTbody.children)) {
  //       if (child.querySelector('.inboxsdk__custom_suggestion')) {
  //         const separator = document.createElement('tr');
  //         separator.className = 'inboxsdk__custom_suggestion_separator';
  //         separator.setAttribute('role', 'separator');
  //         separator.innerHTML = '<td><div class="gssb_l"></div></td>';
  //         child.parentElement.insertBefore(separator, child);
  //         break;
  //       }
  //       console.log('child', child.textContent);
  //     }
  //   });
};
