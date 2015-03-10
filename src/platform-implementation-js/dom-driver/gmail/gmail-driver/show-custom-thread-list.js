import _ from 'lodash';
import Bacon from 'baconjs';
import RSVP from 'rsvp';
import GmailElementGetter from '../gmail-element-getter';
import * as GRP from '../gmail-response-processor';

const threadListSearchStrings = new WeakMap();

function doSearchReplacing(driver, onActivate) {
  const preexistingQuery = threadListSearchStrings.get(onActivate);
  if (preexistingQuery) {
    return preexistingQuery;
  }
  const newQuery = Date.now()+'-'+Math.random();
  driver.getPageCommunicator().setupCustomListResultsQuery(newQuery);
  driver.getPageCommunicator().ajaxInterceptStream
    .filter(e =>
      e.type === 'searchForReplacement' &&
      e.query === newQuery
    )
    .flatMap(e => {
      try {
        return Bacon.fromPromise(RSVP.Promise.resolve(onActivate(e.start)), true);
      } catch(e) {
        driver.getLogger().error(e);
        return Bacon.once([]);
      }
    })
    .map(threadIds => RSVP.Promise.all(threadIds.map(id =>
      id[0] == '<' ?
        driver.getMessageIdManager().getGmailThreadIdForRfcMessageId(id).then(gtid => ({gtid, rfcId: id}))
        :
        driver.getMessageIdManager().getRfcMessageIdForGmailThreadId(id).then(rfcId => ({gtid: id, rfcId}))
    )))
    .flatMap(Bacon.fromPromise)
    .onValue(threadIds => {
      const query = threadIds.map(({rfcId}) => 'rfc822msgid:'+rfcId).join(' OR ');
      driver.getPageCommunicator().setCustomListNewQuery(newQuery, query);
      driver.getPageCommunicator().ajaxInterceptStream
        .filter(e =>
          e.type === 'searchResultsResponse' &&
          e.query === newQuery
        )
        .map('.response')
        .take(1)
        .onValue(response => {
          const extractedThreads = GRP.extractThreads(response);
          const newThreads = _.chain(threadIds)
            .map(({gtid}) => _.find(extractedThreads, t => t.gmailThreadId === gtid))
            .compact()
            .value();
          const newResponse = GRP.replaceThreadsInResponse(response, newThreads);
          driver.getPageCommunicator().setCustomListResults(newQuery, newResponse);
        });
    });
  threadListSearchStrings.set(onActivate, newQuery);
  return newQuery;
}

export default function showCustomThreadList(driver, onActivate) {
  const uniqueSearch = doSearchReplacing(driver, onActivate);
  const customHash = document.location.hash;

  Bacon.fromEvent(window, 'hashchange')
    .filter(event => !event.oldURL.match(/#inboxsdk-fake-no-vc$/))
    .takeUntil(
      GmailElementGetter.getMainContentElementChangedStream()
        .take(1)
        .delay(250)
    )
    .merge(Bacon.later(0))
    .onValue(() => {
      driver.hashChangeNoViewChange(customHash);
    });

  const searchHash = '#search/'+encodeURIComponent(uniqueSearch);
  window.history.replaceState(null, null, searchHash);
  const hce = new HashChangeEvent('hashchange', {
    oldURL: document.location.href.replace(/#.*$/, '')+'#inboxsdk-blah',
    newURL: document.location.href.replace(/#.*$/, '')+searchHash
  });
  window.dispatchEvent(hce);
}
