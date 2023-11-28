import type * as Kefir from 'kefir';
import GmailElementGetter from '../gmail-element-getter';
import GmailAppToolbarButtonView from '../views/gmail-app-toolbar-button-view';
import type GmailDriver from '../gmail-driver';
import { AppToolbarButtonDescriptor } from '../../../../inboxsdk';

export default function addToolbarButtonForApp(
  gmailDriver: GmailDriver,
  buttonDescriptor: Kefir.Stream<AppToolbarButtonDescriptor, any>,
): Promise<GmailAppToolbarButtonView> {
  return GmailElementGetter.waitForGmailModeToSettle().then(() => {
    if (GmailElementGetter.isStandalone()) {
      return new Promise((_resolve, _reject) => {
        //never complete
      });
    } else {
      return new GmailAppToolbarButtonView(gmailDriver, buttonDescriptor);
    }
  });
}
