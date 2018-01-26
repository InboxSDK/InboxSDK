/* @flow */

import {defn} from 'ud';
import gmailAjax from './gmailAjax';
import type {Driver} from '../driver-interfaces/driver';


type Options =
  {
    oldGmailMessageID: string;
  } |
  {
    syncMessageID: string;
  };

async function getOriginalMessagePage(driver: Driver, options: Options): Promise<string> {
  const accountParamMatch = document.location.pathname.match(/(\/u\/\d+)\//i);
  // Inbox omits the account param if there is only one logged in account,
  // but this page is backed by Gmail's backend which will always include it.
  const accountParam = accountParamMatch ? accountParamMatch[1] : '/u/0';

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
    url: `https://mail.google.com/mail${accountParam}`,
    canRetry: true,
    data
  });

  return text;
}

export default defn(module, getOriginalMessagePage);
