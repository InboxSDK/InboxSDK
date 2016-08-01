/* @flow */

import {defn} from 'ud';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';

class InboxAttachmentCardView {
  _bus: Kefir.Bus = kefirBus();

  destroy() {
    this._bus.end();
  }

  getEventStream(): Kefir.Stream {
    return this._bus;
  }

  getAttachmentType(): string {
    throw new Error('not implemented yet');
  }

  addButton(options: Object): void {
    throw new Error('not implemented yet');
  }

  getTitle(): string {
    throw new Error('not implemented yet');
  }

  async getDownloadURL(): Promise<?string> {
    throw new Error('not implemented yet');
  }
}

export default defn(module, InboxAttachmentCardView);
