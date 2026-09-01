import * as Kefir from 'kefir';
import type GmailDriver from '../gmail-driver';
import type GmailRouteView from './gmail-route-view/gmail-route-view';
import SelectorRegistry from '../../../lib/dom/selectorRegistry';
import GmailThreadView, {
  normalizeThreadID,
  waitForThreadID,
} from './gmail-thread-view';

jest.mock('pdelay', () => ({
  __esModule: true,
  default: () => Promise.resolve(),
}));

const selectors = new SelectorRegistry();

function getElementThreadIDs(root: HTMLElement) {
  const legacyIdElement = selectors.querySelectorByKey(
    root,
    'threadView.idElement',
  );
  const permanentIdElement = selectors.querySelectorByKey(
    root,
    'threadView.permanentIdElement',
  );

  return {
    legacyThreadID: legacyIdElement?.getAttribute('data-legacy-thread-id'),
    permanentThreadID: permanentIdElement?.getAttribute('data-thread-perm-id'),
  };
}

function makeThreadView(
  element: HTMLElement,
  convertPermanentThreadID: (threadID: string) => Promise<string>,
) {
  const logger = {
    error: jest.fn(),
    eventSdkPassive: jest.fn(),
  };
  const driver = {
    selectors: new SelectorRegistry(),
    getLogger: () => logger,
    waitForGlobalSidebarReady: () => Kefir.never(),
    delayToTimeAfterReady: () => Kefir.never(),
    getOpts: () => ({ REQUESTED_API_VERSION: 2 }),
    getOldGmailThreadIdFromSyncThreadId: convertPermanentThreadID,
  } as unknown as GmailDriver;

  return new GmailThreadView(element, {} as GmailRouteView, driver);
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

describe('waitForThreadID', () => {
  test('returns an existing legacy thread ID', async () => {
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.legacyThreadId = '0123456789abcdef';
    root.append(idElement);

    await expect(
      waitForThreadID(
        () => getElementThreadIDs(root),
        () => null,
        async () => null,
        () => false,
        20,
        1,
      ),
    ).resolves.toEqual({
      threadID: '0123456789abcdef',
      permanentThreadID: null,
    });
  });

  test('waits for Gmail to add a permanent thread ID', async () => {
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.threadPermId = 'thread-f:123';
    const getIDs = jest.fn(() => getElementThreadIDs(root));

    setTimeout(() => root.append(idElement), 10);

    await expect(
      waitForThreadID(
        getIDs,
        () => null,
        async () => '0123456789abcdef',
        () => false,
        50,
        1,
      ),
    ).resolves.toEqual({
      threadID: '0123456789abcdef',
      permanentThreadID: 'thread-f:123',
    });
    expect(getIDs.mock.calls.length).toBeGreaterThan(1);
  });

  test('waits for Gmail to replace a literal undefined attribute', async () => {
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.legacyThreadId = 'undefined';
    root.append(idElement);
    const getIDs = jest.fn(() => getElementThreadIDs(root));

    setTimeout(() => {
      idElement.dataset.legacyThreadId = '0123456789abcdef';
    }, 10);

    await expect(
      waitForThreadID(
        getIDs,
        () => null,
        async () => null,
        () => false,
        50,
        1,
      ),
    ).resolves.toEqual({
      threadID: '0123456789abcdef',
      permanentThreadID: null,
    });
    expect(getIDs.mock.calls.length).toBeGreaterThan(1);
  });

  test('retries the preview-pane fallback while Gmail initializes', async () => {
    const root = document.createElement('div');
    const getFallbackThreadID = jest
      .fn<string | null, []>()
      .mockReturnValueOnce(null)
      .mockReturnValue('0123456789abcdef');

    await expect(
      waitForThreadID(
        () => getElementThreadIDs(root),
        getFallbackThreadID,
        async () => null,
        () => false,
        50,
        1,
      ),
    ).resolves.toEqual({
      threadID: '0123456789abcdef',
      permanentThreadID: null,
    });
    expect(getFallbackThreadID).toHaveBeenCalledTimes(2);
  });

  test('does not accept literal undefined from the fallback', async () => {
    const root = document.createElement('div');
    const getFallbackThreadID = jest
      .fn<string | null, []>()
      .mockReturnValueOnce('undefined')
      .mockReturnValue('0123456789abcdef');

    await expect(
      waitForThreadID(
        () => getElementThreadIDs(root),
        getFallbackThreadID,
        async () => null,
        () => false,
        50,
        1,
      ),
    ).resolves.toEqual({
      threadID: '0123456789abcdef',
      permanentThreadID: null,
    });
    expect(getFallbackThreadID).toHaveBeenCalledTimes(2);
  });

  test('stops a pending permanent-ID conversion when destroyed', async () => {
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.threadPermId = 'thread-f:123';
    root.append(idElement);
    const getIDs = jest.fn(() => getElementThreadIDs(root));
    let isDestroyed = false;
    setTimeout(() => {
      isDestroyed = true;
    }, 10);

    await expect(
      waitForThreadID(
        getIDs,
        () => null,
        () => new Promise<string>(() => {}),
        () => isDestroyed,
        50,
        1,
      ),
    ).rejects.toThrow('thread view destroyed while waiting for threadID');
    expect(getIDs.mock.calls.length).toBeGreaterThan(1);
  });

  test('keeps the existing error message after timing out', async () => {
    const root = document.createElement('div');

    await expect(
      waitForThreadID(
        () => getElementThreadIDs(root),
        () => null,
        async () => null,
        () => false,
        5,
        1,
      ),
    ).rejects.toThrow('threadID element not found');
  });

  test('times out while permanent-ID conversion remains pending', async () => {
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.threadPermId = 'thread-f:123';
    root.append(idElement);

    await expect(
      waitForThreadID(
        () => getElementThreadIDs(root),
        () => null,
        () => new Promise<string>(() => {}),
        () => false,
        5,
        1,
      ),
    ).rejects.toThrow('threadID element not found');
  });

  test('uses a valid permanent ID when a separate legacy element is unusable', async () => {
    const root = document.createElement('div');
    const legacyIdElement = document.createElement('h2');
    legacyIdElement.dataset.legacyThreadId = 'undefined';
    const permanentIdElement = document.createElement('div');
    permanentIdElement.dataset.threadPermId = 'thread-f:123';
    root.append(legacyIdElement, permanentIdElement);
    const convertPermanentThreadID = jest.fn(
      async () => '0123456789abcdef',
    );

    await expect(
      waitForThreadID(
        () => getElementThreadIDs(root),
        () => null,
        convertPermanentThreadID,
        () => false,
        20,
        1,
      ),
    ).resolves.toEqual({
      threadID: '0123456789abcdef',
      permanentThreadID: 'thread-f:123',
    });
    expect(convertPermanentThreadID).toHaveBeenCalledWith('thread-f:123');
  });
});

describe('GmailThreadView thread IDs', () => {
  test('getThreadIDAsync converts a permanent thread ID', async () => {
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.threadPermId = 'thread-f:123';
    root.append(idElement);
    const convertPermanentThreadID = jest.fn(
      async () => '0123456789abcdef',
    );
    const view = makeThreadView(root, convertPermanentThreadID);

    await expect(view.getThreadIDAsync()).resolves.toBe('0123456789abcdef');
    expect(convertPermanentThreadID).toHaveBeenCalledWith('thread-f:123');

    view.destroy();
  });

  test('getThreadID remains synchronous and requires a legacy element', () => {
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.threadPermId = 'thread-f:123';
    root.append(idElement);
    const view = makeThreadView(
      root,
      async () => '0123456789abcdef',
    );

    expect(() => view.getThreadID()).toThrow('threadID element not found');

    view.destroy();
  });
});
