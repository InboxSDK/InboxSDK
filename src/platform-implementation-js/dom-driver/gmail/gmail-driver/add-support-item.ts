import GmailSupportItemView from '../views/gmail-support-item-view';
import GmailDriver from '../gmail-driver';

export default function addSupportItem(
  driver: GmailDriver,
  insertElement: HTMLElement
): GmailSupportItemView {
  return new GmailSupportItemView(driver, insertElement);
}
