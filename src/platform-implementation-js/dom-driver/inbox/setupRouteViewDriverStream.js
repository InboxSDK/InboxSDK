/* @flow */

import Kefir from 'kefir';

import InboxDriver from './inbox-driver';
import InboxRouteView from './views/inbox-route-view';
import InboxCustomRouteView from './views/inbox-custom-route-view';
import InboxDummyRouteView from './views/inbox-dummy-route-view';

import routeIDmatchesHash from '../../lib/routeIDmatchesHash';

export default function setupRouteViewDriverStream(driver: InboxDriver): Kefir.Observable<InboxRouteView|InboxDummyRouteView|InboxCustomRouteView> {
  const customRouteIDs = driver.getCustomRouteIDs();

  let lastRouteView = null;

  driver.getStopper().onValue(() => {
    if (lastRouteView) {
      lastRouteView.destroy();
    }
  });

  return Kefir.merge([
    Kefir.fromEvents(document, 'inboxSDKpushState').map(e =>
      (process.env.NODE_ENV === 'test' && e.detail.__test_url) || document.location.href
    ),
    Kefir.fromEvents(window, 'hashchange').map(e => e.newURL)
  ])
    .toProperty(() => document.location.href)
    .map(href => {
      const m = /#([^?]*)/.exec(href);
      if (!m) return {type: 'NATIVE'};
      const hash = m[1];
      for (let routeIDs of customRouteIDs) {
        let routeID = routeIDmatchesHash(routeIDs, hash);
        if (routeID) {
          return {hash, type: 'CUSTOM', routeID};
        }
      }
      return {type: 'OTHER_APP_CUSTOM'};
    })
    .map(detail => {
      if (detail.type === 'CUSTOM') {
        return new InboxCustomRouteView(detail.routeID, detail.hash);
      } else if (detail.type === 'NATIVE') {
        return new InboxDummyRouteView('NATIVE');
      } else if (detail.type === 'OTHER_APP_CUSTOM') {
        return new InboxDummyRouteView('OTHER_APP_CUSTOM');
      } else {
        driver.getLogger().error(new Error('should not happen'));
        return new InboxDummyRouteView('UNKNOWN');
      }
    })
    .map(routeView => {
      if (lastRouteView) {
        lastRouteView.destroy();
      }
      lastRouteView = routeView;
      return routeView;
    });
}
