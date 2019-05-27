import googleTotp from '../../lib/googleTotp';
import readAuthInfo from './readAuthInfo';
import delay from 'pdelay';

export default async function signIn(testEmail: string) {
  const authInfo = await readAuthInfo();
  try {
    await page.goto('https://mail.google.com', { waitUntil: 'networkidle2' });
  } catch (err) {
    console.error('Gmail load timed out. Trying again...');
    console.log(err);
    await page.goto('https://mail.google.com', { waitUntil: 'networkidle2' });
  }
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
      await page.waitForFunction(
        () =>
          !document.location.href.startsWith(
            'https://accounts.google.com/signin/v2/challenge/totp'
          )
      );
    }
    await delay(1500); // wait for animation to finish
    if (page.url().includes('SmsAuthInterstitial')) {
      console.log('got sms interstitial screen');
      await page.click('#smsauth-interstitial-remindbutton');
    }
  }
  await page.waitForFunction(
    () =>
      document.location.href.startsWith('https://mail.google.com/mail/') &&
      document.location.href.endsWith('#inbox'),
    { polling: 100 }
  );
}
