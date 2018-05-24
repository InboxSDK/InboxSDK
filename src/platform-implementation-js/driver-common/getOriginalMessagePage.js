/* @flow */

import {defn} from 'ud';
import gmailAjax from './gmailAjax';
import getAccountUrlPart from './getAccountUrlPart';
import type {Driver} from '../driver-interfaces/driver';


type Options =
  {
    oldGmailMessageID: string;
  } |
  {
    syncMessageID: string;
  };

async function getOriginalMessagePage(driver: Driver, options: Options): Promise<string> {
  const data = {
    ik: driver.getPageCommunicator().getIkValue(),
    view: 'om'
  };

  if(options.oldGmailMessageID){
    (data: Object).th = options.oldGmailMessageID;
  }
  else if(options.syncMessageID){
    (data: Object).permmsgid = options.syncMessageID;
  }

  const {text} = await gmailAjax({
    method: 'GET',
    url: `https://mail.google.com/mail${getAccountUrlPart()}`,
    canRetry: true,
    data
  });

  return text;
}

export default defn(module, getOriginalMessagePage);
