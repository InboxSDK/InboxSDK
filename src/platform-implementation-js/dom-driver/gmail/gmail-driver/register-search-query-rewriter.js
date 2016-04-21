/* @flow */

import RSVP from 'rsvp';

import type PageCommunicator from '../gmail-page-communicator';

export default function registerSearchQueryRewriter(pageCommunicator: PageCommunicator, obj: Object) {
  pageCommunicator.createCustomSearchTerm(obj.term);

  pageCommunicator.ajaxInterceptStream.filter(function(event) {
    return event.type === 'searchQueryForReplacement' && event.term === obj.term;
  }).onValue(function(event) {
    RSVP.Promise.resolve(obj.termReplacer({})).then(function(result) {
      if (typeof result != 'string') {
        throw new Error("termReplacer response must be a string");
      }
      var newTerm = "(" + result + ")";
      var newQuery = event.query.replace(obj.term, newTerm.replace(/\$/g, '$$$$'));
      pageCommunicator.setSearchQueryReplacement(event.query, newQuery);
    });
  });
}
