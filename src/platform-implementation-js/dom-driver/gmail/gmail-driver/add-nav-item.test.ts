import * as Kefir from 'kefir';
import addNavItem from './add-nav-item';
import GmailElementGetter from '../gmail-element-getter';
import waitFor from '../../../lib/wait-for';
import type GmailDriver from '../gmail-driver';

const driver = {} as GmailDriver;

// Minimal DOM for the classic-hangouts (inline) leftnav path of addNavItem:
// - a non-empty body class so waitForGmailModeToSettle() sees a settled mode
//   (and one that doesn't match GmailElementGetter.isStandalone())
// - .aeN.WR.nH.oy8Mbf[role=navigation] with .aZ6 so waitForNavMenuReady()
//   resolves and shouldAddNavItemsInline() picks the inline path
// - .Ls77Lb.aZ6 > .pp so waitForNavMenuReady()'s second waitFor resolves
function setupGmailLeftNav(): HTMLElement {
  document.body.className = 'inboxsdk-test';
  const aeN = document.createElement('div');
  aeN.className = 'aeN WR nH oy8Mbf aZ6';
  aeN.setAttribute('role', 'navigation');
  document.body.appendChild(aeN);
  const navContents = document.createElement('div');
  navContents.className = 'Ls77Lb aZ6';
  navContents.innerHTML = '<div class="pp"></div>';
  document.body.appendChild(navContents);
  return aeN;
}

// The injection container (.aeN .n3) that _createNavItemsHolder waits for.
function addInjectionContainer(aeN: HTMLElement): HTMLElement {
  const n3 = document.createElement('div');
  n3.className = 'n3';
  aeN.appendChild(n3);
  return n3;
}

function navItemDescriptorStream() {
  return Kefir.never();
}

describe('addNavItem DOM readiness (#1156)', () => {
  let aeN: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    aeN = setupGmailLeftNav();
  });

  test('waits for the injection container and inserts the nav item once it appears', async () => {
    expect(
      GmailElementGetter.getSameSectionNavItemMenuInjectionContainer(),
    ).toBeNull();

    const view = await addNavItem(driver, 'app1', navItemDescriptorStream());

    // Simulate Gmail rendering the injection container after addNavItem was
    // called. Pre-#1156-fix code threw 'should not happen' here instead of
    // waiting, so the nav item never appeared.
    setTimeout(() => addInjectionContainer(aeN), 50);

    await waitFor(
      () => document.querySelector('.inboxsdk__navMenu .TK .inboxsdk__navItem'),
      4000,
      25,
    );

    expect(document.querySelectorAll('.inboxsdk__navMenu').length).toBe(1);
    expect(view.getElement().parentElement).toBe(
      document.querySelector('.inboxsdk__navMenu .TK'),
    );
  });

  test('concurrent addNavItem calls create exactly one holder', async () => {
    const viewPromises = Promise.all([
      addNavItem(driver, 'app1', navItemDescriptorStream()),
      addNavItem(driver, 'app1', navItemDescriptorStream()),
    ]);

    setTimeout(() => addInjectionContainer(aeN), 50);

    await viewPromises;
    await waitFor(
      () =>
        document.querySelectorAll('.inboxsdk__navMenu .TK .inboxsdk__navItem')
          .length === 2 || null,
      4000,
      25,
    );

    expect(document.querySelectorAll('.inboxsdk__navMenu').length).toBe(1);
  });

  test('does not insert the element of a view destroyed during the wait', async () => {
    const view = await addNavItem(driver, 'app1', navItemDescriptorStream());

    view.remove();
    addInjectionContainer(aeN);

    await waitFor(() => document.querySelector('.inboxsdk__navMenu'), 4000, 25);
    // The insertion (if it were wrongly to happen) follows holder creation by
    // a microtask; wait one small interval past the holder appearing to
    // verify no insertion occurs.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(view.getElement().isConnected).toBe(false);
    expect(document.querySelector('.inboxsdk__navItem')).toBeNull();
  });

  test('reuses the existing holder for nav items added later', async () => {
    addInjectionContainer(aeN);

    await addNavItem(driver, 'app1', navItemDescriptorStream());
    await waitFor(
      () =>
        document.querySelectorAll('.inboxsdk__navMenu .TK .inboxsdk__navItem')
          .length === 1 || null,
      4000,
      25,
    );

    await addNavItem(driver, 'app1', navItemDescriptorStream());
    await waitFor(
      () =>
        document.querySelectorAll('.inboxsdk__navMenu .TK .inboxsdk__navItem')
          .length === 2 || null,
      4000,
      25,
    );

    expect(document.querySelectorAll('.inboxsdk__navMenu').length).toBe(1);
  });

  describe('GmailElementGetter.getSameSectionNavItemMenuInjectionContainer', () => {
    test('returns null while .aeN .n3 is missing', () => {
      expect(
        GmailElementGetter.getSameSectionNavItemMenuInjectionContainer(),
      ).toBeNull();
    });

    test('returns the container once present', () => {
      const n3 = addInjectionContainer(aeN);
      expect(
        GmailElementGetter.getSameSectionNavItemMenuInjectionContainer(),
      ).toBe(n3);
    });
  });
});
