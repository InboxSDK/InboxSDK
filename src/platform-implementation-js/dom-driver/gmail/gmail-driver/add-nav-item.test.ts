import waitFor from '../../../lib/wait-for';

// We test the core behavior that _createNavItemsHolder depends on:
// waitFor retries until the element is available. This validates
// the fix for #1156 where the nav injection container is not
// immediately available on slow connections.

describe('addNavItem DOM readiness', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('waitFor resolves once the nav injection container appears', async () => {
    // Simulate the container not existing initially
    let callCount = 0;
    const getContainer = () => {
      callCount++;
      return document.querySelector<HTMLElement>('.aeN .n3');
    };

    // Add the element after a delay (simulating slow Gmail load)
    setTimeout(() => {
      const aeN = document.createElement('div');
      aeN.className = 'aeN';
      const n3 = document.createElement('div');
      n3.className = 'n3';
      aeN.appendChild(n3);
      document.body.appendChild(aeN);
    }, 50);

    const result = await waitFor(getContainer, 5000, 10);
    expect(result).toBeInstanceOf(HTMLElement);
    expect(result.className).toBe('n3');
    expect(callCount).toBeGreaterThan(1);
  });

  test('waitFor rejects if container never appears', async () => {
    const getContainer = () => document.querySelector<HTMLElement>('.aeN .n3');

    await expect(waitFor(getContainer, 100, 10)).rejects.toThrowError(
      'waitFor timeout',
    );
  });

  test('waitFor resolves immediately if container already exists', async () => {
    // Container is already in the DOM
    const aeN = document.createElement('div');
    aeN.className = 'aeN';
    const n3 = document.createElement('div');
    n3.className = 'n3';
    aeN.appendChild(n3);
    document.body.appendChild(aeN);

    let callCount = 0;
    const getContainer = () => {
      callCount++;
      return document.querySelector<HTMLElement>('.aeN .n3');
    };

    const result = await waitFor(getContainer, 5000, 10);
    expect(result).toBe(n3);
    expect(callCount).toBe(1);
  });
});
