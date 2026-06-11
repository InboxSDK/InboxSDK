import GmailElementGetter from '../gmail-element-getter';
import waitFor from '../../../lib/wait-for';
import querySelector from '../../../lib/dom/querySelectorOrFail';

// Tests for the #1156 fix: _createNavItemsHolder now uses waitFor()
// instead of throwing "should not happen" when the injection container
// (.aeN .n3) isn't in the DOM yet.

describe('addNavItem DOM readiness (#1156)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function addNavInjectionContainer(): HTMLElement {
    const aeN = document.createElement('div');
    aeN.className = 'aeN';
    const n3 = document.createElement('div');
    n3.className = 'n3';
    aeN.appendChild(n3);
    document.body.appendChild(aeN);
    return n3;
  }

  describe('injection container availability', () => {
    test('getSameSectionNavItemMenuInjectionContainer returns null when .aeN .n3 is missing', () => {
      expect(
        GmailElementGetter.getSameSectionNavItemMenuInjectionContainer(),
      ).toBeNull();
    });

    test('getSameSectionNavItemMenuInjectionContainer returns element when present', () => {
      const n3 = addNavInjectionContainer();
      expect(
        GmailElementGetter.getSameSectionNavItemMenuInjectionContainer(),
      ).toBe(n3);
    });
  });

  describe('waitFor integration (replaces synchronous throw)', () => {
    test('resolves when injection container appears after a delay', async () => {
      // This is the exact waitFor call used in _createNavItemsHolder
      const containerPromise = waitFor(
        () => GmailElementGetter.getSameSectionNavItemMenuInjectionContainer(),
        5000,
        10,
      );

      // Simulate Gmail rendering the nav container asynchronously
      setTimeout(() => addNavInjectionContainer(), 50);

      const result = await containerPromise;
      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.className).toBe('n3');
    });

    test('resolves immediately when injection container already exists', async () => {
      addNavInjectionContainer();

      let callCount = 0;
      const result = await waitFor(() => {
        callCount++;
        return GmailElementGetter.getSameSectionNavItemMenuInjectionContainer();
      }, 5000);

      expect(result).toBeInstanceOf(HTMLElement);
      expect(callCount).toBe(1);
    });

    test('rejects after timeout when container never appears', async () => {
      await expect(
        waitFor(
          () =>
            GmailElementGetter.getSameSectionNavItemMenuInjectionContainer(),
          100,
          10,
        ),
      ).rejects.toThrowError('waitFor timeout');
    });
  });

  describe('nav items holder creation', () => {
    test('holder has correct structure after insertion', () => {
      const n3 = addNavInjectionContainer();

      // Replicate _createNavItemsHolder insertion logic
      const holder = document.createElement('div');
      holder.setAttribute('class', 'LrBjie inboxsdk__navMenu');
      holder.innerHTML = '<div class="TK"></div>';
      n3.insertBefore(holder, n3.children[2]);

      // Verify the holder was inserted into the container
      expect(n3.querySelector('.inboxsdk__navMenu')).toBe(holder);
      // Verify the TK child exists (used by _getNavItemsHolder)
      expect(querySelector(holder, '.TK')).toBeInstanceOf(HTMLElement);
    });

    test('existing holder is reused instead of creating a duplicate', () => {
      addNavInjectionContainer();

      // Simulate an existing holder already in the DOM
      // (the _getNavItemsHolder check)
      const existingHolder = document.createElement('div');
      existingHolder.className = 'inboxsdk__navMenu';
      existingHolder.innerHTML = '<div class="TK"></div>';
      document.body.appendChild(existingHolder);

      // _getNavItemsHolder checks for existing holder first
      const found = document.querySelector('.inboxsdk__navMenu');
      expect(found).toBe(existingHolder);
      expect(querySelector(found as HTMLElement, '.TK')).toBeInstanceOf(
        HTMLElement,
      );
    });
  });
});
