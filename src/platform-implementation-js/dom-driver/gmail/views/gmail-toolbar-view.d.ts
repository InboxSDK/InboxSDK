import { Stopper } from 'kefir-stopper';
import { ThreadView } from '../../../platform-implementation';
import ThreadRowView from './gmail-thread-row-view';

export default class GmailToolbarView {
  addButton(buttonDescriptor: any, id?: string): any;
  getStopper(): Stopper;
  getThreadViewDriver(): ThreadView | null | undefined;
  getThreadRowViewDrivers(): Set<ThreadRowView>;
  isForRowList(): boolean;
  isForThread(): boolean;
}
