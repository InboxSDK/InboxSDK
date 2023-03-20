import * as Kefir from 'kefir';
import { ElementWithLifetime } from '../../../lib/dom/make-element-child-stream';

export default class GmailMessageView {
  getEventStream(): Kefir.Observable<any, unknown>;
  getReplyElementStream(): Kefir.Observable<ElementWithLifetime, unknown>;
  isLoaded(): boolean;
}
