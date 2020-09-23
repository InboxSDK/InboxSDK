import googleTotp from '../../lib/googleTotp';
import readAuthInfo from './readAuthInfo';
import delay from 'pdelay';

export default async function signIn(testEmail: string) {
  const authInfo = await readAuthInfo();
  console.log(
    '==== authInfo[testEmail].password',
    authInfo[testEmail].password
  );
  const context = await browser.createIncognitoBrowserContext();
  const page = await context.newPage();
  try {
    await page.goto('https://mail.google.com', { waitUntil: 'networkidle2' });
  } catch (err) {
    console.error('Gmail load timed out. Trying again...');
    console.log(err);
    await page.goto('https://mail.google.com', { waitUntil: 'networkidle2' });
  }
  if (page.url().startsWith('https://www.google.com/intl/en-GB/gmail/about/')) {
    await page.goto(
      'https://accounts.google.com/AccountChooser?service=mail&continue=https://mail.google.com/mail/'
    );
  }
  if (page.url().startsWith('https://accounts.google.com/')) {
    // eslint-disable-next-line no-console
    console.log('need to sign in');
    await page.waitForSelector(
      'input[type=email]:not([aria-hidden=true]), input[type=password]'
    );
    if (await page.$('input[type=email]:not([aria-hidden=true])')) {
      await page.type('input[type=email]:not([aria-hidden=true])', testEmail, {
        delay: 10 + Math.random() * 10
      });
      await page.click('div#identifierNext');
      await page.waitForSelector('input[type=password]');
      await delay(2000); // wait for animation to finish
    }

    const fillOutPassword = async () => {
      await page.type('input[type=password]', authInfo[testEmail].password, {
        delay: 10 + Math.random() * 10
      });
      await page.click('div#passwordNext');

      await page.waitForFunction(
        () =>
          !document.location.href.startsWith(
            'https://accounts.google.com/signin/v2/sl/pwd'
          )
      );
    };

    try {
      await fillOutPassword();
    } catch (err) {
      // Navigation failed b/c password didn't work. Try again.
      await fillOutPassword();
    }

    await delay(1500); // wait for animation to finish
    if (
      page
        .url()
        .startsWith('https://accounts.google.com/signin/v2/challenge/totp')
    ) {
      // eslint-disable-next-line no-console
      console.log('needs 2fa');
      await page.waitForSelector('input[type=tel]#totpPin');

      const fillOut2FACode = async () => {
        const twoFACode = googleTotp(authInfo[testEmail].twofactor);
        await page.click('input[type=tel]#totpPin', { clickCount: 3 });
        await page.type('input[type=tel]#totpPin', twoFACode, {
          delay: 10 + Math.random() * 10
        });
        await page.click('div#totpNext');
        await page.waitForFunction(
          () =>
            !document.location.href.startsWith(
              'https://accounts.google.com/signin/v2/challenge/totp'
            )
        );
      };

      try {
        await fillOut2FACode();
      } catch (err) {
        // Navigation failed b/c 2fa code didn't work. Try again.
        await fillOut2FACode();
      }
    }
    await delay(1500); // wait for animation to finish
    if (page.url().includes('SmsAuthInterstitial')) {
      // eslint-disable-next-line no-console
      console.log('got sms interstitial screen');
      await page.click('#smsauth-interstitial-remindbutton');
    }
  }
  // await page.waitForFunction(
  //   () =>
  //     document.location.href.startsWith('https://mail.google.com/mail/') &&
  //     document.location.href.endsWith('#inbox'),
  //   { polling: 100 }
  // );
}
