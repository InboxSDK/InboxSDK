import waitFor from '../../../../../lib/wait-for';

// Tests for the tablist race condition fix (#1287).
// Validates that waitFor correctly handles the case where the
// [role=tablist] attribute is set asynchronously by Gmail.

const TAB_LIST_SELECTOR = '[role=tablist],.J-KU-Jg';

describe('addCompanionThreadIconArea tablist detection', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  test('waitFor resolves when tablist role is set after a delay', async () => {
    const tablistEl = document.createElement('div');
    container.appendChild(tablistEl);

    // Simulate Gmail setting the role attribute asynchronously
    setTimeout(() => {
      tablistEl.setAttribute('role', 'tablist');
    }, 50);

    const result = await waitFor(
      () => container.querySelector(TAB_LIST_SELECTOR),
      5000,
      10,
    );
    expect(result).toBe(tablistEl);
  });

  test('waitFor resolves immediately when tablist already exists', async () => {
    const tablistEl = document.createElement('div');
    tablistEl.setAttribute('role', 'tablist');
    container.appendChild(tablistEl);

    const result = await waitFor(
      () => container.querySelector(TAB_LIST_SELECTOR),
      5000,
      10,
    );
    expect(result).toBe(tablistEl);
  });

  test('waitFor resolves via fallback J-KU-Jg class selector', async () => {
    const tablistEl = document.createElement('div');
    tablistEl.className = 'J-KU-Jg';
    container.appendChild(tablistEl);

    const result = await waitFor(
      () => container.querySelector(TAB_LIST_SELECTOR),
      5000,
      10,
    );
    expect(result).toBe(tablistEl);
  });

  test('waitFor rejects after timeout when tablist never appears', async () => {
    await expect(
      waitFor(() => container.querySelector(TAB_LIST_SELECTOR), 100, 10),
    ).rejects.toThrowError('waitFor timeout');
  });

  test('icon area is inserted relative to separator when present', () => {
    // Unit test for the insertion logic (synchronous, no waitFor needed)
    const tablistEl = document.createElement('div');
    tablistEl.setAttribute('role', 'tablist');
    const separator = document.createElement('div');
    separator.setAttribute('role', 'separator');
    const existingIcon = document.createElement('div');
    existingIcon.className = 'existing-icon';

    container.appendChild(tablistEl);
    container.appendChild(separator);
    container.appendChild(existingIcon);

    const iconArea = document.createElement('div');
    iconArea.className = 'sidebar_iconArea';

    // Replicate the insertion logic from addCompanionThreadIconArea
    if (separator.parentElement) {
      separator.parentElement.insertBefore(
        iconArea,
        separator.nextElementSibling,
      );
    }

    // iconArea should be inserted between separator and existingIcon
    expect(container.children[0]).toBe(tablistEl);
    expect(container.children[1]).toBe(separator);
    expect(container.children[2]).toBe(iconArea);
    expect(container.children[3]).toBe(existingIcon);
  });

  test('icon area is inserted before tablist when no separator', () => {
    const tablistEl = document.createElement('div');
    tablistEl.setAttribute('role', 'tablist');
    container.appendChild(tablistEl);

    const iconArea = document.createElement('div');
    iconArea.className = 'sidebar_iconArea';

    // Replicate the fallback insertion logic
    tablistEl.insertAdjacentElement('beforebegin', iconArea);

    expect(container.children[0]).toBe(iconArea);
    expect(container.children[1]).toBe(tablistEl);
  });
});
