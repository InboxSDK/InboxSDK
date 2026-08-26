import type * as Kefir from 'kefir';
import GmailAppToolbarButtonView from '../views/gmail-app-toolbar-button-view';
import type GmailDriver from '../gmail-driver';
import { AppToolbarButtonDescriptor } from '../../../../inboxsdk';

export default function addToolbarButtonForApp(
  gmailDriver: GmailDriver,
  buttonDescriptor: Kefir.Observable<AppToolbarButtonDescriptor, any>,
): Promise<GmailAppToolbarButtonView> {
  return gmailDriver.elementGetter.waitForGmailModeToSettle().then(() => {
    if (gmailDriver.elementGetter.isStandalone()) {
      return new Promise((_resolve, _reject) => {
        //never complete
      });
    } else {
      return new GmailAppToolbarButtonView(gmailDriver, buttonDescriptor);
    }
  });
}
