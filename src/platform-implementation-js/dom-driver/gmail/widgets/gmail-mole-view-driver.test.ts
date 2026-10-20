import './gmail-mole-view-driver';

const flush = () => new Promise((resolve) => setTimeout(resolve, 300));

// The mole parent is only discovered once (then polled every 5s), so all
// tests share a single dock and reset its contents between tests.
document.body.innerHTML = `
  <div class="dw"><div class="nH"><div class="nH"><div class="no">
    <div style="order: 2147483647;"></div>
  </div></div></div></div>
`;
const dock = document.querySelector<HTMLElement>('.no')!;

afterEach(() => {
  while (dock.firstElementChild !== dock.lastElementChild) {
    dock.firstElementChild!.remove();
  }
});

function makeNativeMole(withIframe = false): HTMLElement {
  const mole = document.createElement('div');
  mole.className = 'nn nH';
  if (withIframe) {
    mole.appendChild(document.createElement('iframe'));
  }
  return mole;
}

function makeSdkMole(): HTMLElement {
  const mole = document.createElement('div');
  mole.className = 'inboxsdk__mole_view';
  return mole;
}

function trackRemovals(parent: HTMLElement) {
  const removed: Node[] = [];
  const observer = new MutationObserver((records) => {
    for (const record of records) removed.push(...record.removedNodes);
  });
  observer.observe(parent, { childList: true });
  return { removed, stop: () => observer.disconnect() };
}

describe('GmailMoleViewDriver native mole ordering', () => {
  beforeAll(flush);

  it('does not move a native mole that is already rightmost', async () => {
    const tracker = trackRemovals(dock);
    const mole = makeNativeMole();
    dock.insertBefore(mole, dock.lastElementChild);
    await flush();
    tracker.stop();
    expect(tracker.removed).not.toContain(mole);
  });

  it('moves a compose mole to the right of SDK moles', async () => {
    const sdkMole = makeSdkMole();
    dock.insertBefore(sdkMole, dock.lastElementChild);
    const mole = makeNativeMole();
    dock.insertBefore(mole, sdkMole);
    await flush();
    expect(mole.nextElementSibling).toBe(dock.lastElementChild);
    expect(sdkMole.nextElementSibling).toBe(mole);
  });

  it('never moves a mole containing an iframe (e.g. Google Chat)', async () => {
    const sdkMole = makeSdkMole();
    dock.insertBefore(sdkMole, dock.lastElementChild);
    const tracker = trackRemovals(dock);
    const chatMole = makeNativeMole(true);
    dock.insertBefore(chatMole, sdkMole);
    await flush();
    tracker.stop();
    expect(tracker.removed).not.toContain(chatMole);
    expect(chatMole.nextElementSibling).toBe(sdkMole);
  });
});
