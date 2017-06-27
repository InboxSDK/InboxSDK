/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import gmailAjax from '../../../driver-common/gmailAjax';
import {readDraftId} from '../gmail-response-processor';
import type GmailDriver from '../gmail-driver';
import isStreakAppId from '../../../lib/is-streak-app-id';

const getDraftIDForMessageID: (driver: GmailDriver, messageID: string) => Promise<?string> =
  _.memoize(async function(driver: GmailDriver, messageID: string): Promise<?string> {
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
      return readDraftId(response.text, messageID);
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
