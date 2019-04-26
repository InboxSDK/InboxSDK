/* @flow */

import readAuthInfo from './lib/readAuthInfo';
import googleTotp from '../lib/googleTotp';
import delay from 'pdelay';
import waitFor from '../../src/platform-implementation-js/lib/wait-for';

it('works', async () => {
  await page.goto('https://mail.google.com');
  if (page.url().startsWith('https://www.google.com/gmail/about/')) {
    await page.goto(
      'https://accounts.google.com/AccountChooser?service=mail&continue=https://mail.google.com/mail/'
    );
  }
  if (page.url().startsWith('https://accounts.google.com/')) {
    console.log('need to sign in');
    const authInfo = await readAuthInfo();

    await page.waitForSelector('input[type=email]');
    await page.type('input[type=email]', 'inboxsdktest@gmail.com', {
      delay: 10 + Math.random() * 10
    });
    await page.click('div[role=button]#identifierNext');
    await page.waitForSelector('input[type=password]');
    await delay(1000);
    await page.type(
      'input[type=password]',
      authInfo['inboxsdktest@gmail.com'].password,
      { delay: 10 + Math.random() * 10 }
    );
    await page.click('div[role=button]#passwordNext');

    await delay(1000);
    if (
      page
        .url()
        .startsWith('https://accounts.google.com/signin/v2/challenge/totp')
    ) {
      await page.waitForSelector('input[type=tel]#totpPin');

      const twoFACode = googleTotp(
        authInfo['inboxsdktest@gmail.com'].twofactor
      );
      await page.type('input[type=tel]#totpPin', twoFACode, {
        delay: 10 + Math.random() * 10
      });
      await page.click('div[role=button]#totpNext');
    }
  }
  await waitFor(() => page.url().startsWith('https://mail.google.com/mail/'));
  await waitFor(() => page.url().endsWith('#inbox'));

  await delay(1000);
  console.log(
    'head data-sdk-load',
    await page.$eval('head', head => head.getAttribute('data-sdk-load'))
  );
  // await jestPuppeteer.debug();
});
