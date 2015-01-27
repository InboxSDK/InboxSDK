var Bacon = require('baconjs');
var RSVP = require('rsvp');
var makeMutationObserverStream = require('../../../lib/dom/make-mutation-observer-stream');
var gmailElementGetter = require('../gmail-element-getter');

module.exports = function registerSearchAutocompleter(driver, handler) {
  const pageCommunicator = driver.getPageCommunicator();
  pageCommunicator.announceSearchAutocompleter();

  pageCommunicator.ajaxInterceptStream
    .filter((event) => event.type === 'suggestionsRequest')
    .onValue((event) => {
      RSVP.Promise.resolve(handler({query:event.query})).then((suggestions) => {
        if (!Array.isArray(suggestions)) {
          throw new Error("autocompleter response must be an array");
        }
        pageCommunicator.provideAutocompleteSuggestions(event.query, suggestions);
      });
    });
};
