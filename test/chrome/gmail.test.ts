import signIn from './lib/signIn';
import attemptWithRetries from '../../src/platform-implementation-js/lib/attemptWithRetries';
import pexpect from 'expect-puppeteer';
import { Page } from 'puppeteer';

// const testEmail = 'inboxsdktest@gmail.com';
const testEmail = 'pipelinetest@streak.com';

// https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md

beforeAll(async () => {
  await page.setViewport({ width: 1024, height: 768 });
  await signIn(testEmail);
  await page.waitForSelector('.inboxsdk__appid_warning');
  await page.click('.inboxsdk__appid_warning .inboxsdk__x_close_button');
  expect(await getCounter('data-sdk-load')).toBe(1);
});

afterEach(async () => {
  const errors = await page.evaluate(() => {
    const errors = (window as any)._errors;
    (window as any)._errors = [];
    return errors;
  });
  console.log('=== errors', errors);
  expect(Array.isArray(errors)).toBe(true);
  expect(errors).toEqual([]);
});

beforeEach(async () => {
  // close any open composeviews
  while (await page.$('.inboxsdk__compose')) {
    await page.click('.inboxsdk__compose [role=button][aria-label^="Discard"]');
  }
  // go to inbox if necessary
  if (!page.url().endsWith('#inbox')) {
    await page.evaluate(() => {
      document.location.hash = '#inbox';
    });
  }
  // reset all counters
  await page.$eval('head', head => {
    head
      .getAttributeNames()
      .filter(name => name.startsWith('data-test-'))
      .forEach(name => {
        head.removeAttribute(name);
      });
  });
});

function waitForCounter(attribute: string, goal: number): Promise<number> {
  return page.waitForFunction(
    (attribute, goal) => {
      const value = Number(document.head.getAttribute(attribute));
      if (value >= goal) {
        return value;
      }
      return null;
    },
    { polling: 100 },
    attribute,
    goal
  ) as any;
}

function getCounter(attribute: string): Promise<number> {
  return page.$eval(
    'head',
    (head, attribute) => Number(head.getAttribute(attribute)),
    attribute
  );
}

async function openThread() {
  await attemptWithRetries(async () => {
    await page
      .waitForSelector('tr.zA[id] span.bog', { visible: true })
      .then(el => el.click());
  }, 3);
  await page.waitForFunction(() => document.location.hash !== '#inbox');
}

describe('compose', () => {
  for (const mode of ['full', 'reply']) {
    describe(mode, () => {
      beforeEach(async () => {
        // Open a compose at the start
        switch (mode) {
          case 'reply': {
            await openThread();
            // reply button
            await page
              .waitForSelector('span.ams.bkH[role=link]', {
                visible: true
              })
              .then(el => el.click());
            break;
          }
          case 'full': {
            await page.click('[gh=cm]');
            await page.waitForSelector('.inboxsdk__compose');
            break;
          }
        }
      });

      test('compose button, discard', async () => {
        await page.waitForSelector('.test__tooltipButton');
        expect(
          await page.$eval('.test__tooltipButton', el => el.textContent)
        ).toBe('Counter: 0');
        await page.click('.test__tooltipButton');
        expect(
          await page.$eval('.test__tooltipButton', el => el.textContent)
        ).toBe('Counter: 1');

        await page.click('.inboxsdk__composeButton[aria-label="Monkeys!"]');
        expect(await page.$('.test__tooltipButton')).toBe(null);
        expect(await page.$('div.test__dropdownContent')).not.toBe(null);

        await page.click(
          '.inboxsdk__compose [role=button][aria-label^="Discard"]'
        );

        expect(await getCounter('data-test-composeDiscardEmitted')).toBe(1);
        expect(await getCounter('data-test-composeDestroyEmitted')).toBe(1);
      });

      test('compose presending, sending, sent', async () => {
        if (mode === 'reply') {
          await page.waitForSelector('.inboxsdk__compose div.aoD.hl[tabindex]');
          await page.click('.inboxsdk__compose div.aoD.hl[tabindex]');
          while (await page.$('.inboxsdk__compose .wO.nr span.vN.bfK[email]')) {
            await page.keyboard.press('Backspace');
          }
        }
        await page.type(
          '.inboxsdk__compose textarea[aria-label="To"]',
          testEmail
        );
        if (mode === 'full') {
          await page.type(
            '.inboxsdk__compose input[aria-label="Subject"]',
            `InboxSDK Inbox ComposeView events test @ ${Date.now()}`
          );
        }
        await page.type(
          '.inboxsdk__compose div[contenteditable=true][aria-label="Message Body"]',
          'Test message! cancel send'
        );
        await page.click(
          '.inboxsdk__compose div[role=button][aria-label^="Send"]'
        );

        expect(await getCounter('data-test-composePresendingEmitted')).toBe(1);
        expect(await getCounter('data-test-composeSendCanceledEmitted')).toBe(
          1
        );
        expect(await getCounter('data-test-composeSendingEmitted')).toBe(0);
        expect(await getCounter('data-test-composeSentEmitted')).toBe(0);
        expect(await getCounter('data-test-composeDiscardEmitted')).toBe(0);
        expect(await getCounter('data-test-composeDestroyEmitted')).toBe(0);

        await waitForCounter('data-test-compose-getDraftID', 1);
        expect(await getCounter('data-test-compose-getDraftID')).toBe(1);

        await page.$eval(
          '.inboxsdk__compose div[contenteditable=true][aria-label="Message Body"]',
          input => {
            input.textContent = '';
          }
        );
        await page.type(
          '.inboxsdk__compose div[contenteditable=true][aria-label="Message Body"]',
          'Test message!'
        );

        await page.click(
          '.inboxsdk__compose div[role=button][aria-label^="Send"]'
        );

        await waitForCounter('data-test-composeSentEmitted', 1);

        expect(await getCounter('data-test-composePresendingEmitted')).toBe(2);
        expect(await getCounter('data-test-composeSendCanceledEmitted')).toBe(
          1
        );
        expect(await getCounter('data-test-composeSendingEmitted')).toBe(1);
        expect(await getCounter('data-test-composeSentEmitted')).toBe(1);
        expect(await getCounter('data-test-composeDiscardEmitted')).toBe(0);
        expect(await getCounter('data-test-composeDestroyEmitted')).toBe(1);
      });
    });
  }
});

describe('sidebar', () => {
  beforeAll(async () => {
    await page.evaluate(() => {
      document.head.setAttribute('data-flag-enable-sidebar', 'true');
    });
  });

  beforeEach(async () => {
    await openThread();
  });

  afterAll(async () => {
    await page.evaluate(() => {
      document.head.setAttribute('data-flag-enable-sidebar', 'false');
    });
  });

  it('opens and closes', async () => {
    await page.waitForSelector(
      'button.inboxsdk__button_icon[data-tooltip="Test Sidebar"]',
      { visible: true }
    );
    const sidebarIsOpen =
      (await (await page.$(
        'button.test__sidebarCounterButton'
      ))!.boundingBox()) != null;
    if (!sidebarIsOpen) {
      await page.click(
        'button.inboxsdk__button_icon[data-tooltip="Test Sidebar"]'
      );
      await page.waitForSelector('button.test__sidebarCounterButton', {
        visible: true
      });
    }
    expect(
      await page.$eval(
        'button.test__sidebarCounterButton',
        el => el.textContent
      )
    ).toBe('Counter: 0');
    await page.click('button.test__sidebarCounterButton');
    expect(
      await page.$eval(
        'button.test__sidebarCounterButton',
        el => el.textContent
      )
    ).toBe('Counter: 1');

    // close
    await page.click(
      'button.inboxsdk__button_icon[data-tooltip="Test Sidebar"]'
    );
    await page.waitForSelector('button.test__sidebarCounterButton', {
      hidden: true
    });

    // open
    await page.click(
      'button.inboxsdk__button_icon[data-tooltip="Test Sidebar"]'
    );
    await page.waitForSelector('button.test__sidebarCounterButton', {
      visible: true
    });

    expect(
      await page.$eval(
        'button.test__sidebarCounterButton',
        el => el.textContent
      )
    ).toBe('Counter: 1');
    await page.click('button.test__sidebarCounterButton');
    expect(
      await page.$eval(
        'button.test__sidebarCounterButton',
        el => el.textContent
      )
    ).toBe('Counter: 2');
  });
});

describe('custom view', () => {
  it('works', async () => {
    expect(await page.$('.test__customRouteElement')).toBe(null);

    await page.click(
      '.inboxsdk__navItem .inboxsdk__navItem_name[title="custom view"]'
    );
    expect(
      await page.$eval('.test__customRouteElement', el => el.textContent)
    ).toBe('beep 123');
  });
});
