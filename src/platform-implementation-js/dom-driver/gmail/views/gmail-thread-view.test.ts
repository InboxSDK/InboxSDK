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
  convertPermanentThreadID: (threadID: string) => Promise<string | null>,
  isPreviewedThread = false,
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

  return {
    logger,
    view: new GmailThreadView(
      element,
      { getParams: () => ({}) } as GmailRouteView,
      driver,
      isPreviewedThread,
    ),
  };
}

afterEach(() => {
  document.documentElement.removeAttribute('data-inboxsdk-thread-diagnostics');
});

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
      source: 'legacy-attribute',
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
      source: 'permanent-attribute',
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
      source: 'legacy-attribute',
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
      source: 'preview-pane',
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
      source: 'preview-pane',
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
        () => new Promise<string>(() => undefined),
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
        () => new Promise<string>(() => undefined),
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
    const convertPermanentThreadID = jest.fn(async () => '0123456789abcdef');

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
      source: 'permanent-attribute',
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
    const convertPermanentThreadID = jest.fn(async () => '0123456789abcdef');
    const { view } = makeThreadView(root, convertPermanentThreadID);

    await expect(view.getThreadIDAsync()).resolves.toBe('0123456789abcdef');
    expect(convertPermanentThreadID).toHaveBeenCalledWith('thread-f:123');

    view.destroy();
  });

  test('getThreadID remains synchronous and requires a legacy element', () => {
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.threadPermId = 'thread-f:123';
    root.append(idElement);
    const { view } = makeThreadView(root, async () => '0123456789abcdef');

    expect(() => view.getThreadID()).toThrow('threadID element not found');

    view.destroy();
  });

  test('reports a terminal synchronous ID failure only through the thrown error', () => {
    document.documentElement.setAttribute(
      'data-inboxsdk-thread-diagnostics',
      'true',
    );
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.legacyThreadId = 'undefined';
    root.append(idElement);
    const { logger, view } = makeThreadView(root, async () => null);

    let error: unknown;
    try {
      view.getThreadID();
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      message: 'Failed to get id for thread',
      preview: false,
      rootConnected: false,
      legacyAttributePresent: true,
      legacyAttributeValid: false,
      permanentAttributePresent: false,
      permanentAttributeValid: false,
    });
    expect(logger.error).not.toHaveBeenCalled();
    view.destroy();
  });

  test('does not emit resolution diagnostics by default', async () => {
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.legacyThreadId = '0123456789abcdef';
    root.append(idElement);
    const { logger, view } = makeThreadView(root, async () => null);

    await view.getThreadIDAsync();

    expect(logger.eventSdkPassive).not.toHaveBeenCalled();
    view.destroy();
  });

  test('emits only safe resolution diagnostics when enabled', async () => {
    document.documentElement.setAttribute(
      'data-inboxsdk-thread-diagnostics',
      'true',
    );
    const root = document.createElement('div');
    const idElement = document.createElement('h2');
    idElement.dataset.legacyThreadId = '0123456789abcdef';
    root.append(idElement);
    document.body.append(root);
    const { logger, view } = makeThreadView(root, async () => null);

    await view.getThreadIDAsync();

    expect(logger.eventSdkPassive).toHaveBeenCalledWith(
      'threadView.threadIDResolution',
      {
        source: 'legacy-attribute',
        elapsedMilliseconds: expect.any(Number),
        preview: false,
        rootConnected: true,
        legacyAttributePresent: true,
        permanentAttributePresent: false,
        outcome: 'success',
      },
      true,
    );
    view.destroy();
    root.remove();
  });

  test('adds safe enumerable diagnostics to an asynchronous ID failure', async () => {
    document.documentElement.setAttribute(
      'data-inboxsdk-thread-diagnostics',
      'true',
    );
    const root = document.createElement('div');
    const legacyIdElement = document.createElement('h2');
    legacyIdElement.dataset.legacyThreadId = 'undefined';
    const idElement = document.createElement('h2');
    idElement.dataset.threadPermId = 'thread-f:123';
    root.append(legacyIdElement, idElement);
    const { logger, view } = makeThreadView(root, async () => null);

    let error: unknown;
    try {
      await view.getThreadIDAsync();
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(Error);
    expect(Object.keys(error as Error).sort()).toEqual(
      [
        'elapsedMilliseconds',
        'legacyAttributePresent',
        'legacyAttributeValid',
        'outcome',
        'permanentAttributePresent',
        'permanentAttributeValid',
        'preview',
        'rootConnected',
      ].sort(),
    );
    expect(error).toMatchObject({
      preview: false,
      rootConnected: false,
      legacyAttributePresent: true,
      legacyAttributeValid: false,
      permanentAttributePresent: true,
      permanentAttributeValid: true,
      outcome: 'failure',
      elapsedMilliseconds: expect.any(Number),
    });
    expect(logger.eventSdkPassive).not.toHaveBeenCalled();
    view.destroy();
  });

  test('adds safe enumerable diagnostics to a missing parent error', () => {
    document.documentElement.setAttribute(
      'data-inboxsdk-thread-diagnostics',
      'true',
    );
    const root = document.createElement('div');
    const { view } = makeThreadView(root, async () => null, true);

    let error: unknown;
    try {
      view.addCustomMessage(Kefir.never());
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(Error);
    expect(Object.keys(error as Error).sort()).toEqual(
      [
        'legacyAttributePresent',
        'legacyAttributeValid',
        'permanentAttributePresent',
        'permanentAttributeValid',
        'preview',
        'rootConnected',
      ].sort(),
    );
    expect(error).toMatchObject({
      preview: true,
      rootConnected: false,
      legacyAttributePresent: false,
      legacyAttributeValid: false,
      permanentAttributePresent: false,
      permanentAttributeValid: false,
    });
    view.destroy();
  });

  test('adds safe enumerable diagnostics to a missing label container error', () => {
    document.documentElement.setAttribute(
      'data-inboxsdk-thread-diagnostics',
      'true',
    );
    const root = document.createElement('div');
    const { view } = makeThreadView(root, async () => null);

    let error: unknown;
    try {
      view.addLabel();
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(Error);
    expect(Object.keys(error as Error).sort()).toEqual(
      [
        'legacyAttributePresent',
        'legacyAttributeValid',
        'permanentAttributePresent',
        'permanentAttributeValid',
        'preview',
        'rootConnected',
      ].sort(),
    );
    expect(error).toMatchObject({
      preview: false,
      rootConnected: false,
      legacyAttributePresent: false,
      legacyAttributeValid: false,
      permanentAttributePresent: false,
      permanentAttributeValid: false,
    });
    view.destroy();
  });
});
