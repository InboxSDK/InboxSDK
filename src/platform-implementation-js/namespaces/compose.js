/* @flow */

import _ from 'lodash';
import * as ud from 'ud';
import RSVP from 'rsvp';
import Kefir from 'kefir';
import get from '../../common/get-or-fail';
import ComposeView from '../views/compose-view';
import HandlerRegistry from '../lib/handler-registry';

import type {PiOpts} from '../platform-implementation';
import type {Handler} from '../lib/handler-registry';
import type {Driver} from '../driver-interfaces/driver';

const memberMap = ud.defonce(module, ()=>new WeakMap());


const SAMPLE_RATE = 0.01;
// documented in src/docs/
class Compose {

  constructor(appId: string, driver: Driver, piOpts: PiOpts) {
    const members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.driver = driver;
    members.piOpts = piOpts;

    members.handlerRegistry = new HandlerRegistry();
    driver.getStopper().onValue(() => {
      members.handlerRegistry.dumpHandlers();
    });
    members.composeViewStream = members.driver.getComposeViewDriverStream().map(viewDriver =>
      new ComposeView(driver, viewDriver, members.appId, members.composeViewStream)
    );

    members.composeViewStream.onValue(view => {
      driver.getLogger().trackFunctionPerformance(() => {
        members.handlerRegistry.addTarget(view);
      }, SAMPLE_RATE, {
        type: 'composeViewHandler',
        isInlineReplyForm: view.isInlineReplyForm()
      })
    });
  }

  registerComposeViewHandler(handler){
    return get(memberMap, this).handlerRegistry.registerHandler(handler);
  }

  openNewComposeView(): Promise<ComposeView> {
    const members = get(memberMap, this);
    const promise = members.composeViewStream.take(1).toPromise(RSVP.Promise);
    members.driver.openComposeWindow();
    return promise;
  }

  openDraftByMessageID(messageID: string): Promise<ComposeView> {
    const members = get(memberMap, this);
    const newComposePromise = members.composeViewStream
      .merge(Kefir.later(3000, null))
      .take(1)
      .flatMap(function(view) {
        return view ? Kefir.constant(view) : Kefir.constantError(new Error("draft did not open"));
      })
      .toPromise(RSVP.Promise);
    members.driver.openDraftByMessageID(messageID);
    return newComposePromise;
  }

  getComposeView(): Promise<ComposeView> {
    const {driver, piOpts} = get(memberMap, this);
    driver.getLogger().deprecationWarning('Compose.getComposeView', 'Compose.openNewComposeView');
    if (piOpts.REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued');
    }
    return this.openNewComposeView();
  }
}

export default ud.defn(module, Compose);
