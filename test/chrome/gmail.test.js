/* @flow */

import readAuthInfo from './lib/readAuthInfo';
import googleTotp from '../lib/googleTotp';
import delay from 'pdelay';
import waitFor from '../../src/platform-implementation-js/lib/wait-for';

// https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md

beforeAll(async () => {
  await page.setViewport({ width: 1024, height: 768 });
});

const testEmail = 'inboxsdktest@gmail.com';

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
    await page.type('input[type=email]', testEmail, {
      delay: 10 + Math.random() * 10
    });
    await page.click('div[role=button]#identifierNext');
    await page.waitForSelector('input[type=password]');
    await delay(1000);
    await page.type('input[type=password]', authInfo[testEmail].password, {
      delay: 10 + Math.random() * 10
    });
    await page.click('div[role=button]#passwordNext');

    await delay(1000);
    if (
      page
        .url()
        .startsWith('https://accounts.google.com/signin/v2/challenge/totp')
    ) {
      await page.waitForSelector('input[type=tel]#totpPin');

      const twoFACode = googleTotp(authInfo[testEmail].twofactor);
      await page.type('input[type=tel]#totpPin', twoFACode, {
        delay: 10 + Math.random() * 10
      });
      await page.click('div[role=button]#totpNext');
    }
  }
  await waitFor(() => page.url().startsWith('https://mail.google.com/mail/'));
  await waitFor(() => page.url().endsWith('#inbox'));

  await page.waitForSelector('.inboxsdk__appid_warning');
  await page.click('.inboxsdk__appid_warning .inboxsdk__x_close_button');

  // Test a regular compose
  await openCompose();

  expect(await page.$eval('.test__tooltipButton', el => el.textContent)).toBe(
    'Counter: 0'
  );
  await page.click('.test__tooltipButton');
  expect(await page.$eval('.test__tooltipButton', el => el.textContent)).toBe(
    'Counter: 1'
  );

  await page.click('.inboxsdk__composeButton[aria-label="Monkeys!"]');
  expect(await page.$('.test__tooltipButton')).toBe(null);
  expect(await page.$('div.test__dropdownContent')).not.toBe(null);

  await page.click('.inboxsdk__compose [role=button][aria-label^="Discard"]');

  // expect(
  //   await page.$eval('head', head => Number(head.getAttribute('data-test-composeDiscardEmitted')))
  // ).toBe(1);
  // expect(
  //   await page.$eval('head', head => Number(head.getAttribute('data-test-composeDestroyEmitted')))
  // ).toBe(1);

  // Test presending/sending/sent events
  // await openCompose();
  // await page.type('.inboxsdk__compose textarea[aria-label="To"]', testEmail);
  // await page.type('.inboxsdk__compose input[aria-label="Subject"]', `InboxSDK Inbox ComposeView events test @ ${Date.now()}`);
  // await page.type('.inboxsdk__compose div[contenteditable=true][aria-label="Message Body"]', 'Test message!');

  // // console.log(
  // //   'head data-sdk-load',
  // //   await page.$eval('head', head => head.getAttribute('data-sdk-load'))
  // // );
  // await jestPuppeteer.debug();
});

async function openCompose() {
  await page.click('[gh=cm]');
  await page.waitForSelector('.inboxsdk__compose');
}
