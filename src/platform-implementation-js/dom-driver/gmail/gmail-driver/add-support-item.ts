import GmailSupportItemView, {
  SupportItemDescriptor,
} from '../views/gmail-support-item-view';
import GmailDriver from '../gmail-driver';

export default function addSupportItem(
  driver: GmailDriver,
  supportItemDescriptor: SupportItemDescriptor
): GmailSupportItemView {
  return new GmailSupportItemView(driver, supportItemDescriptor);
}
