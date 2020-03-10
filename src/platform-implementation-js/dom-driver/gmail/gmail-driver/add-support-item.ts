import GmailSupportItemView from '../views/gmail-support-item-view';
import GmailDriver from '../gmail-driver';

export default function addSupportItem(
  driver: GmailDriver,
  supportItemDescriptor: {
    element: HTMLElement;
  }
): GmailSupportItemView {
  return new GmailSupportItemView(driver, supportItemDescriptor);
}
