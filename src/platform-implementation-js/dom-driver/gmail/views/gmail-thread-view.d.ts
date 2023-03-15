import { Observable } from 'kefir';
import { Stopper } from 'kefir-stopper';
import GmailMessageView from './gmail-message-view';

export default class GmailThreadView {
  getMessageViewDriverStream(): Observable<GmailMessageView, unknown>;
  getStopper(): Stopper;
  getToolbarView(): any;
}
