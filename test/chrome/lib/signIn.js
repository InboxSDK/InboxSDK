/* @flow */

import googleTotp from '../../lib/googleTotp';
import readAuthInfo from './readAuthInfo';
import delay from 'pdelay';

const testEmail = 'inboxsdktest@gmail.com';

export default async function signIn() {
  const authInfo = await readAuthInfo();
  await page.goto('https://mail.google.com');
  if (page.url().startsWith('https://www.google.com/gmail/about/')) {
    await page.goto(
      'https://accounts.google.com/AccountChooser?service=mail&continue=https://mail.google.com/mail/'
    );
  }
  if (page.url().startsWith('https://accounts.google.com/')) {
    console.log('need to sign in');
    await page.waitForSelector(
      'input[type=email]:not([aria-hidden=true]), input[type=password]'
    );
    if (await page.$('input[type=email]:not([aria-hidden=true])')) {
      await page.type('input[type=email]:not([aria-hidden=true])', testEmail, {
        delay: 10 + Math.random() * 10
      });
      await page.click('div[role=button]#identifierNext');
      await page.waitForSelector('input[type=password]');
      await delay(1000); // wait for animation to finish
    }
    await page.type('input[type=password]', authInfo[testEmail].password, {
      delay: 10 + Math.random() * 10
    });
    await page.click('div[role=button]#passwordNext');

    await page.waitForFunction(
      () =>
        !document.location.href.startsWith(
          'https://accounts.google.com/signin/v2/sl/pwd'
        )
    );
    await delay(1500); // wait for animation to finish
    if (
      page
        .url()
        .startsWith('https://accounts.google.com/signin/v2/challenge/totp')
    ) {
      console.log('needs 2fa');
      await page.waitForSelector('input[type=tel]#totpPin');

      const twoFACode = googleTotp(authInfo[testEmail].twofactor);
      await page.type('input[type=tel]#totpPin', twoFACode, {
        delay: 10 + Math.random() * 10
      });
      await page.click('div[role=button]#totpNext');
    }
  }
  await page.waitForFunction(
    () =>
      document.location.href.startsWith('https://mail.google.com/mail/') &&
      document.location.href.endsWith('#inbox'),
    { polling: 100 }
  );
  await page.waitForSelector('.inboxsdk__appid_warning');
  await page.click('.inboxsdk__appid_warning .inboxsdk__x_close_button');
}
