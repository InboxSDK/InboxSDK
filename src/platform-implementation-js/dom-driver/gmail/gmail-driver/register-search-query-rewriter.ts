import type PageCommunicator from '../gmail-page-communicator';

export default function registerSearchQueryRewriter(
  pageCommunicator: PageCommunicator,
  obj: any,
) {
  pageCommunicator.createCustomSearchTerm(obj.term);

  pageCommunicator.ajaxInterceptStream
    .filter((event) => {
      return (
        event.type === 'searchQueryForReplacement' && event.term === obj.term
      );
    })
    .onValue((event) => {
      Promise.resolve(obj.termReplacer({})).then((result) => {
        if (typeof result != 'string') {
          throw new Error('termReplacer response must be a string');
        }
        const newTerm = '(' + result + ')';
        const newQuery = event.query.replace(
          obj.term,
          () => newTerm, // Callback used so $ escapes aren't interpreted
        );
        pageCommunicator.setSearchQueryReplacement(event.query, newQuery);
      });
    });
}
