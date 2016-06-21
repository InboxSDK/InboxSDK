/* @flow */

import _ from 'lodash';
import * as ud from 'ud';
import RSVP from 'rsvp';
import Kefir from 'kefir';

import ComposeView from '../views/compose-view';
import HandlerRegistry from '../lib/handler-registry';

import type {Handler} from '../lib/handler-registry';
import type {Driver} from '../driver-interfaces/driver';

const memberMap = ud.defonce(module, ()=>new WeakMap());


const SAMPLE_RATE = 0.01;
// documented in src/docs/
class Compose {

  constructor(appId: string , driver: Driver){
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.driver = driver;

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

  registerComposeViewHandler(handler: Handler){
    return memberMap.get(this).handlerRegistry.registerHandler(handler);
  }

  openNewComposeView(): Promise<ComposeView> {
    return this.getComposeView();
  }

  openDraftByMessageID(messageID: string): Promise<ComposeView> {
    var members = memberMap.get(this);
    var newComposePromise = members.composeViewStream
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
    var members = memberMap.get(this);
    var promise = members.composeViewStream.take(1).toPromise(RSVP.Promise);
    members.driver.openComposeWindow();
    return promise;
  }
}

Compose = ud.defn(module, Compose);

export default Compose;
