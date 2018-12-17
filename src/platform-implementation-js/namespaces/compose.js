/* @flow */

import * as ud from 'ud';
import RSVP from 'rsvp';
import Kefir from 'kefir';
import get from '../../common/get-or-fail';
import ComposeView from '../views/compose-view';
import HandlerRegistry from '../lib/handler-registry';

import type Membrane from '../lib/Membrane';
import type {PiOpts} from '../platform-implementation';
import type {Handler} from '../lib/handler-registry';
import type {Driver} from '../driver-interfaces/driver';

const memberMap = ud.defonce(module, ()=>new WeakMap());


const SAMPLE_RATE = 0.01;
// documented in src/docs/
class Compose {

  constructor(driver: Driver, membrane: Membrane) {
    const members = {
      driver,
      membrane,
      handlerRegistry: new HandlerRegistry(),
      composeViewStream: driver.getComposeViewDriverStream().map(viewDriver =>
        (membrane.get(viewDriver): ComposeView)
      )
    };
    memberMap.set(this, members);

    driver.getStopper().onValue(() => {
      members.handlerRegistry.dumpHandlers();
    });

    members.composeViewStream.onValue(view => {
      driver.getLogger().trackFunctionPerformance(() => {
        members.handlerRegistry.addTarget(view);
      }, SAMPLE_RATE, {
        type: 'composeViewHandler',
        isInlineReplyForm: view.isInlineReplyForm()
      });
    });
  }

  registerComposeViewHandler(handler: Handler<ComposeView>){
    return get(memberMap, this).handlerRegistry.registerHandler(handler);
  }

  async openNewComposeView(): Promise<ComposeView> {
    const members = get(memberMap, this);
    const composeViewDriver = await members.driver.openNewComposeViewDriver();
    return members.membrane.get(composeViewDriver);
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
    const {driver} = get(memberMap, this);
    driver.getLogger().deprecationWarning('Compose.getComposeView', 'Compose.openNewComposeView');
    if (driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }
    return this.openNewComposeView();
  }
}

export default ud.defn(module, Compose);
