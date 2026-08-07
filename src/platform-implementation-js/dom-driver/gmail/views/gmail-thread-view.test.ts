import { normalizeThreadID, waitForThreadIdSource } from './gmail-thread-view';
import SelectorRegistry from '../../../lib/dom/selectorRegistry';

const selectors = new SelectorRegistry();

function getThreadIdElement(root: HTMLElement) {
  return () =>
    selectors.querySelectorByKey(root, 'threadView.idElement');
}

describe('normalizeThreadID', () => {
  test.each([undefined, null, '', 'undefined'])(
    'rejects an unusable value: %p',
    (value) => {
      expect(normalizeThreadID(value)).toBeNull();
    },
  );

  test.each(['0123456789abcdef', 'thread-f:123', 'not-16-characters'])(
    'does not assume a particular Gmail thread ID format: %s',
    (value) => {
      expect(normalizeThreadID(value)).toBe(value);
    },
  );
});

describe('waitForThreadIdSource', () => {
  test('returns an existing legacy thread ID element', async () => {
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.legacyThreadId = '0123456789abcdef';
    root.append(idElement);

    await expect(
      waitForThreadIdSource(
        getThreadIdElement(root),
        () => null,
        () => false,
        20,
        1,
      ),
    ).resolves.toBe(idElement);
  });

  test('waits for Gmail to add the thread ID element', async () => {
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.threadPermId = 'thread-f:123';

    setTimeout(() => root.append(idElement), 0);

    await expect(
      waitForThreadIdSource(
        getThreadIdElement(root),
        () => null,
        () => false,
        50,
        1,
      ),
    ).resolves.toBe(idElement);
  });

  test('waits for Gmail to replace a literal undefined attribute', async () => {
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.legacyThreadId = 'undefined';
    root.append(idElement);

    setTimeout(() => {
      idElement.dataset.legacyThreadId = '0123456789abcdef';
    }, 0);

    await expect(
      waitForThreadIdSource(
        getThreadIdElement(root),
        () => null,
        () => false,
        50,
        1,
      ),
    ).resolves.toBe(idElement);
  });

  test('retries the preview-pane fallback while Gmail initializes', async () => {
    const root = document.createElement('div');
    const getFallbackThreadID = jest
      .fn<string | null, []>()
      .mockReturnValueOnce(null)
      .mockReturnValue('0123456789abcdef');

    await expect(
      waitForThreadIdSource(
        getThreadIdElement(root),
        getFallbackThreadID,
        () => false,
        50,
        1,
      ),
    ).resolves.toBe('0123456789abcdef');
    expect(getFallbackThreadID).toHaveBeenCalledTimes(2);
  });

  test('does not accept literal undefined from the fallback', async () => {
    const root = document.createElement('div');
    const getFallbackThreadID = jest
      .fn<string | null, []>()
      .mockReturnValueOnce('undefined')
      .mockReturnValue('0123456789abcdef');

    await expect(
      waitForThreadIdSource(
        getThreadIdElement(root),
        getFallbackThreadID,
        () => false,
        50,
        1,
      ),
    ).resolves.toBe('0123456789abcdef');
    expect(getFallbackThreadID).toHaveBeenCalledTimes(2);
  });

  test('stops waiting when the thread view is destroyed', async () => {
    const root = document.createElement('div');
    let isDestroyed = false;
    setTimeout(() => {
      isDestroyed = true;
    }, 0);

    await expect(
      waitForThreadIdSource(
        getThreadIdElement(root),
        () => null,
        () => isDestroyed,
        50,
        1,
      ),
    ).rejects.toThrow('thread view destroyed while waiting for threadID');
  });

  test('keeps the existing error message after timing out', async () => {
    const root = document.createElement('div');

    await expect(
      waitForThreadIdSource(
        getThreadIdElement(root),
        () => null,
        () => false,
        5,
        1,
      ),
    ).rejects.toThrow('threadID element not found');
  });
});
