/**
 * @jest-environment jsdom
 */
import * as Kefir from 'kefir';
import GmailThreadView from './gmail-thread-view';

function createDriverMock(overrides: Record<string, any> = {}) {
  return {
    getOpts: () => ({ REQUESTED_API_VERSION: 2 }),
    waitForGlobalSidebarReady: () => Kefir.constant(null),
    delayToTimeAfterReady: () => Kefir.never(),
    getLogger: () => ({
      error: jest.fn(),
      eventSdkPassive: jest.fn(),
    }),
    getPageCommunicator: () => ({
      getCurrentThreadID: jest.fn(),
    }),
    getOldGmailThreadIdFromSyncThreadId: jest.fn(async (id: string) => {
      if (id === 'thread-f:123') return 'abcdef0123456789';
      throw new Error('unknown sync id');
    }),
    getAppId: () => 'test',
    ...overrides,
  };
}

describe('GmailThreadView.getThreadIDAsync', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns data-legacy-thread-id from the thread element', async () => {
    const el = document.createElement('div');
    el.innerHTML = `<h2 class="hP" data-legacy-thread-id="19fb3e4994277632" data-thread-perm-id="thread-f:1">Subject</h2>`;
    document.body.appendChild(el);

    const view = new (GmailThreadView as any)(
      el,
      null,
      createDriverMock(),
      true,
    );
    await expect(view.getThreadIDAsync()).resolves.toBe('19fb3e4994277632');
  });

  it('waits for data-legacy-thread-id in preview pane', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const view = new (GmailThreadView as any)(
      el,
      null,
      createDriverMock(),
      true,
    );
    const pending = view.getThreadIDAsync();

    setTimeout(() => {
      el.innerHTML = `<h2 class="hP" data-legacy-thread-id="19fb4041fbed794e">Subject</h2>`;
    }, 150);

    await expect(pending).resolves.toBe('19fb4041fbed794e');
  });

  it('falls back to selected row legacy id in preview pane', async () => {
    document.body.innerHTML = `
      <div gh="tl">
        <table><tbody>
          <tr class="aps">
            <td><span data-thread-id="#thread-f:1872158555841721906" data-legacy-thread-id="19fb3e4994277632">Subject</span></td>
          </tr>
        </tbody></table>
      </div>
      <div class="preview"></div>
    `;
    const el = document.querySelector('.preview') as HTMLElement;

    const view = new (GmailThreadView as any)(
      el,
      null,
      createDriverMock(),
      true,
    );
    await expect(view.getThreadIDAsync()).resolves.toBe('19fb3e4994277632');
  });

  it('falls back to sync id conversion when only sync id is available', async () => {
    jest.useFakeTimers();
    const el = document.createElement('div');
    document.body.appendChild(el);

    const getCurrentThreadID = jest.fn(() => 'thread-f:123');
    const view = new (GmailThreadView as any)(
      el,
      null,
      createDriverMock({
        getPageCommunicator: () => ({ getCurrentThreadID }),
      }),
      true,
    );

    const pending = view.getThreadIDAsync();
    await jest.advanceTimersByTimeAsync(5_100);
    await expect(pending).resolves.toBe('abcdef0123456789');
    expect(getCurrentThreadID).toHaveBeenCalledWith(el, true);
    jest.useRealTimers();
  });
});
