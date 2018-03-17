/* @flow */

import memoize from 'lodash/memoize';
import {defn} from 'ud';
import gmailAjax from '../../../driver-common/gmailAjax';
import {readDraftId} from '../gmail-response-processor';
import type GmailDriver from '../gmail-driver';
import isStreakAppId from '../../../lib/is-streak-app-id';

export type GetDraftIdResult = {
  draftID: ?string;
  debugData: ?Object;
};

const getDraftIDForMessageID: (driver: GmailDriver, messageID: string) => Promise<GetDraftIdResult> =
  memoize(async (driver: GmailDriver, messageID: string) => {
    const response = await gmailAjax({
      method: 'GET',
      url: (document.location:any).origin+document.location.pathname,
      data: {
        ui: '2',
        ik: driver.getPageCommunicator().getIkValue(),
        view: 'cv',
        th: messageID,
        prf: '1',
        nsc: '1',
        mb: '0',
        rt: 'j',
        search: 'drafts'
      }
    });
    try {
      const draftID = readDraftId(response.text, messageID);
      const debugData = {responseText: response.text};
      return {draftID, debugData};
    } catch (err) {
      if (isStreakAppId(driver.getAppId())) {
        driver.getLogger().error(err, {
          message: 'failed to read draft ID',
          messageID,
          text: response.text
        });
      }
      throw err;
    }
  }, (driver, messageID) => messageID);

export default defn(module, getDraftIDForMessageID);
