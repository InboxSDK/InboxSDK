/* @flow */
declare var browser;

import googleTotp from '../../lib/googleTotp';
import readAuthInfo from './readAuthInfo';

export default function signIn() {
  const authInfo = readAuthInfo();

  browser.url('https://inbox.google.com');
  browser.waitForVisible('input[type=email], input[name=Email]');
  browser.pause(700);
  browser.setValue('input[type=email], input[name=Email]', 'inboxsdktest@gmail.com');
  browser.click('div[role=button]#identifierNext, input#next');
  browser.waitForVisible('input[type=password], input[name=Passwd]');
  browser.pause(700);
  browser.setValue('input[type=password], input[name=Passwd]', authInfo['inboxsdktest@gmail.com'].password);
  browser.click('div[role=button]#passwordNext, input#signIn');
  browser.waitForVisible('input[name=totpPin], input[name=Pin]');
  browser.pause(700);
  browser.setValue('input[name=totpPin], input[name=Pin]', googleTotp(authInfo['inboxsdktest@gmail.com'].twofactor));

  const oldTitle = browser.getTitle();
  browser.click('div[role=button]#totpNext, input#submit');
  browser.waitUntil(() => {
    try {
      return browser.getTitle() !== oldTitle;
    } catch (err) {
      // The first call to getTitle() seems prone to throwing a timeout error
      console.error('caught getTitle error', err);
      return false;
    }
  });

  // Deal with an interstitial page.
  if (!browser.getTitle().startsWith('Inbox ')) {
    const scrolldownBtn = browser.element('div[role=button][aria-label="Scroll to agree"] img[src*="_arrow_down_"]');
    if (scrolldownBtn.state === 'success') {
      scrolldownBtn.click();
    }
    browser.pause(500);
    browser.click('div[role=button]:not([aria-label]):not([title]), input[type="submit"]#smsauth-interstitial-confirmbutton');
  }

  browser.waitUntil(() => browser.getTitle().startsWith('Inbox '));
}
