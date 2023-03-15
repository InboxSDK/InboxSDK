import { Observable } from 'kefir';
import GmailDriver from '../../gmail-driver';

export default class GmailAppSidebarView {
  constructor(driver: GmailDriver, el: HTMLElement);
  addGlobalSidebarContentPanel(descriptor: Observable<any, unknown>): any;
}
