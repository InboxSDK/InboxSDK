jest.mock('./get-rfc-message-id-for-gmail-message-id', () =>
  jest.fn(async () => 'rfc-message-id'),
);
jest.mock('../../../driver-common/getSyncThreadsForSearch', () =>
  jest.fn(async () => ({
    threads: [
      {
        syncThreadID: 'thread-f:123',
        extraMetaData: {
          syncMessageData: [
            { oldMessageID: '18a', syncMessageID: 'msg-a:456' },
          ],
        },
      },
    ],
  })),
);

import openDraftByMessageID, {
  makeNewHash,
  makeNewSyncHash,
} from './open-draft-by-message-id';

// encodeDraftUrlId('thread-f:123', 'msg-a:456')
const COMPOSE_ID = 'FBkcwTvWncnsbBVBZCtfDWS';

describe('makeNewHash', () => {
  it('1', () => {
    expect(makeNewHash('', '123')).toBe('#?compose=123');
  });
  it('2', () => {
    expect(makeNewHash('#', '123')).toBe('#?compose=123');
  });
  it('3', () => {
    expect(makeNewHash('#inbox', '123')).toBe('#inbox?compose=123');
  });
  it('4', () => {
    expect(makeNewHash('#inbox?compose=123', '456')).toBe(
      '#inbox?compose=123%2C456',
    );
  });
  it('5', () => {
    expect(makeNewHash('#inbox?foo=5', '123')).toBe('#inbox?foo=5&compose=123');
  });
});

describe('makeNewSyncHash', () => {
  it('appends to the given hash', () => {
    expect(makeNewSyncHash('#inbox', 'thread-f:123', 'msg-a:456')).toBe(
      `#inbox?compose=${COMPOSE_ID}`,
    );
  });
  it('keeps a route that has a path segment', () => {
    expect(
      makeNewSyncHash('#starred/p14237', 'thread-f:123', 'msg-a:456'),
    ).toBe(`#starred/p14237?compose=${COMPOSE_ID}`);
  });
  it('replaces an existing compose param', () => {
    expect(
      makeNewSyncHash('#inbox?compose=old', 'thread-f:123', 'msg-a:456'),
    ).toBe(`#inbox?compose=${COMPOSE_ID}`);
  });
});

describe('openDraftByMessageID', () => {
  function makeMockDriver({ customRoute = false } = {}): any {
    return {
      isCurrentRouteCustom: () => customRoute,
      createLink: jest.fn(
        (routeID: string, params: any) =>
          '#' + routeID.replace(/:page/, params?.page ?? '0'),
      ),
    };
  }

  beforeEach(() => {
    window.location.hash = '#somewhere-else';
  });

  it('uses the current hash on a native route when no routeID is given', async () => {
    const driver = makeMockDriver();
    await openDraftByMessageID(driver, '18a');

    expect(driver.createLink).not.toHaveBeenCalled();
    expect(window.location.hash).toBe(`#somewhere-else?compose=${COMPOSE_ID}`);
  });

  it('falls back to a native route when a custom route is showing', async () => {
    const driver = makeMockDriver({ customRoute: true });
    await openDraftByMessageID(driver, '18a');

    expect(driver.createLink).toHaveBeenCalledWith('starred/:page', {
      page: expect.any(Number),
    });
    expect(window.location.hash).toMatch(
      new RegExp(`^#starred/\\d+\\?compose=${COMPOSE_ID}$`),
    );
  });

  it('uses a fresh fallback page on every call', async () => {
    const driver = makeMockDriver({ customRoute: true });
    await openDraftByMessageID(driver, '18a');
    await openDraftByMessageID(driver, '18a');

    const [[, first], [, second]] = driver.createLink.mock.calls;
    expect(second.page).toBeGreaterThan(first.page);
  });

  it('prefers an explicit routeID over the custom-route fallback', async () => {
    const driver = makeMockDriver({ customRoute: true });
    await openDraftByMessageID(driver, '18a', { routeID: 'inbox/:page' });

    expect(driver.createLink).toHaveBeenCalledWith('inbox/:page', undefined);
    expect(window.location.hash).toBe(`#inbox/0?compose=${COMPOSE_ID}`);
  });

  it('builds the hash from routeID instead of the current hash', async () => {
    const driver = makeMockDriver();
    await openDraftByMessageID(driver, '18a', { routeID: 'starred/:page' });

    expect(driver.createLink).toHaveBeenCalledWith('starred/:page', undefined);
    expect(window.location.hash).toBe(`#starred/0?compose=${COMPOSE_ID}`);
  });

  it('passes routeParams through to createLink', async () => {
    const driver = makeMockDriver();
    await openDraftByMessageID(driver, '18a', {
      routeID: 'starred/:page',
      routeParams: { page: 14237 },
    });

    expect(driver.createLink).toHaveBeenCalledWith('starred/:page', {
      page: 14237,
    });
    expect(window.location.hash).toBe(`#starred/14237?compose=${COMPOSE_ID}`);
  });

  it('throws when the message has no matching syncMessageData', async () => {
    await expect(
      openDraftByMessageID(makeMockDriver(), 'not-a-known-message'),
    ).rejects.toThrow('Failed to find syncMessageData');
  });
});
