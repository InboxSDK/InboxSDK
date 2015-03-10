import _ from 'lodash';
import Bacon from 'baconjs';
import RSVP from 'rsvp';
import GmailElementGetter from '../gmail-element-getter';
import * as GRP from '../gmail-response-processor';

const threadListSearchStrings = new WeakMap();

function findIdFailure(id, err) {
  console.log("Failed to find id for thread", id, err);
  return null;
}

function doSearchReplacing(driver, onActivate) {
  const preexistingQuery = threadListSearchStrings.get(onActivate);
  if (preexistingQuery) {
    return preexistingQuery;
  }
  let start;
  const newQuery = Date.now()+'-'+Math.random();
  driver.getPageCommunicator().setupCustomListResultsQuery(newQuery);
  driver.getPageCommunicator().ajaxInterceptStream
    .filter(e =>
      e.type === 'searchForReplacement' &&
      e.query === newQuery
    )
    .flatMap(e => {
      start = e.start;
      try {
        return Bacon.fromPromise(RSVP.Promise.resolve(onActivate(e.start)), true);
      } catch(e) {
        driver.getLogger().error(e);
        return Bacon.once([]);
      }
    })
    .mapError(e => {
      driver.getLogger().error(e);
      return [];
    })
    .map(ids => ids.map(id => {
      if (typeof id === 'string') {
        if (id[0] == '<') {
          return {rfcId: id};
        } else {
          return {gtid: id};
        }
      } else {
        return id;
      }
    }))
    // Figure out any rfc ids we don't know yet
    .map(idPairs => RSVP.Promise.all(idPairs.map(pair =>
      pair.rfcId ? pair :
      driver.getMessageIdManager().getRfcMessageIdForGmailThreadId(pair.gtid)
        .then(rfcId => ({gtid: pair.gtid, rfcId}), findIdFailure.bind(null, pair.gtid))
    )))
    .flatMap(Bacon.fromPromise)
    .map(_.compact)
    .onValue(idPairs => {
      const query = idPairs.map(({rfcId}) => 'rfc822msgid:'+rfcId).join(' OR ');
      driver.getPageCommunicator().setCustomListNewQuery(newQuery, query);
      Bacon.combineAsArray([
        // Figure out any gmail thread ids we don't know yet
        Bacon.fromPromise(RSVP.Promise.all(idPairs.map(pair =>
          pair.gtid ? pair :
          driver.getMessageIdManager().getGmailThreadIdForRfcMessageId(pair.rfcId)
            .then(gtid => ({gtid, rfcId: pair.rfcId}), findIdFailure.bind(null, pair.rfcId))
        ))).map(_.compact),

        driver.getPageCommunicator().ajaxInterceptStream
          .filter(e =>
            e.type === 'searchResultsResponse' &&
            e.query === newQuery && e.start === start
          )
          .map('.response')
          .take(1)
      ]).onValue(([idPairs, response]) => {
        const extractedThreads = GRP.extractThreads(response);
        const newThreads = _.chain(idPairs)
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
