/* @flow */
//jshint ignore:start

import _ from 'lodash';
import ajax from '../../../../common/ajax';
import {readDraftId} from '../gmail-response-processor';
import type GmailDriver from '../gmail-driver';

const getDraftIDForMessageID: (driver: GmailDriver, messageID: string) => Promise<?string> =
  _.memoize(async function(driver: GmailDriver, messageID: string): Promise<?string> {
    const response = await ajax({
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
    return readDraftId(response.text, messageID);
  }, (driver, messageID) => messageID);

export default getDraftIDForMessageID;
