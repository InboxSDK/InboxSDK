import { defn } from 'ud';
import gmailAjax from './gmailAjax';
import { Driver } from '../driver-interfaces/driver';

type Options =
  | {
      oldGmailMessageID: string;
      syncMessageID?: void;
    }
  | {
      syncMessageID: string;
      oldGmailMessageID?: void;
    };

async function getOriginalMessagePage(
  driver: Driver,
  options: Options,
): Promise<string> {
  const data: any = {
    ik: driver.getPageCommunicator().getIkValue(),
    view: 'om',
  };

  if (options.oldGmailMessageID) {
    data.th = options.oldGmailMessageID;
  } else if (options.syncMessageID) {
    data.permmsgid = options.syncMessageID;
  }

  let url;
  const delegatedAccountMatch = document.location.pathname.match(
    /\/u\/(\d+)\/d\/(.+?)\//,
  );
  if (delegatedAccountMatch) {
    url = document.location.origin + document.location.pathname;
  } else {
    const accountParamMatch = document.location.pathname.match(/(\/u\/\d+)\//i);
    //no match happens in inbox when user only has one account
    const accountParam = accountParamMatch ? accountParamMatch[1] : '/u/0';
    url = `https://mail.google.com/mail${accountParam}`;
  }

  const { text } = await gmailAjax({
    url,
    method: 'GET',
    canRetry: true,
    data,
  });

  return text;
}

export default defn(module, getOriginalMessagePage);
