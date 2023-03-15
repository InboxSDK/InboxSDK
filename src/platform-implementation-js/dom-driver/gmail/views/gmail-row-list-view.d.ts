import { Observable } from 'kefir';
import { GmailThreadRowView } from '../../../platform-implementation';
import GmailToolbarView from './gmail-toolbar-view';

export default class GmailRowListView {
  getRowViewDriverStream(): Observable<GmailThreadRowView, unknown>;
  getThreadRowViewDrivers(): Set<GmailThreadRowView>;
  getToolbarView(): GmailToolbarView | null | undefined;
  getSelectedThreadRowViewDrivers(): Set<GmailThreadRowView>;
}
