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

  let url;
  const delegatedAccountMatch = document.location.pathname.match(/\/b\/(.+?)\/u\/(\d+)/);
  if(delegatedAccountMatch){
    url = document.location.origin + document.location.pathname;
  }
  else {
    const accountParamMatch = document.location.pathname.match(/(\/u\/\d+)\//i);
     //no match happens in inbox when user only has one account
    const accountParam = accountParamMatch ? accountParamMatch[1] : '/u/0';
    url = `https://mail.google.com/mail${accountParam}`;
  }


  const {text} = await gmailAjax({
    url,
    method: 'GET',
    canRetry: true,
    data
  });

  return text;
}

export default defn(module, getOriginalMessagePage);
