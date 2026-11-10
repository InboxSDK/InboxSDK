import {
  GMAIL_SELECTORS,
  type SelectorKey,
} from '../../dom-driver/gmail/selectors';
import SelectorRegistry from './selectorRegistry';

/** A compose root whose title-bar table carries the `Ht` token, or not. */
function composeRoot(withHt: boolean): HTMLElement {
  const root = document.createElement('div');
  root.className = 'nH Hy aXJ';
  root.innerHTML = `
    <table class="cf${withHt ? ' Ht' : ''}">
      <tbody><tr><td class="Hm"></td></tr></tbody>
    </table>`;
  return root;
}

test('a mistyped key is rejected at compile time', () => {
  // @ts-expect-error — 'THIS_SELECTOR_DOES_NOT_EXIST' is not a key in GMAIL_SELECTORS
  const mistyped: SelectorKey = 'composeView.THIS_SELECTOR_DOES_NOT_EXIST';

  expect(mistyped in GMAIL_SELECTORS).toBe(false);
});

// No overrides is what most users run.
describe('with no config loaded', () => {
  test('a key resolves through the bundled chain', () => {
    const registry = new SelectorRegistry();
    const root = composeRoot(true);

    expect(registry.querySelectorByKey(root, 'composeView.titleBarTable')).toBe(
      root.querySelector('table'),
    );
    expect(registry.querySelectorByKey(root, 'composeView.titleBarTd')).toBe(
      root.querySelector('td'),
    );
  });

  test('a later rung catches what the first one misses', () => {
    const registry = new SelectorRegistry();
    const root = composeRoot(false);

    expect(registry.querySelectorByKey(root, 'composeView.titleBarTable')).toBe(
      root.querySelector('table'),
    );
  });

  test('querySelectorAllByKey returns every match of the first rung that hits', () => {
    const registry = new SelectorRegistry();
    const root = document.createElement('div');
    root.append(composeRoot(true), composeRoot(true), composeRoot(false));

    // Both `Ht` tables come from the first rung; the `Ht`-less one is left out.
    expect(
      registry.querySelectorAllByKey(root, 'composeView.titleBarTable'),
    ).toEqual(Array.from(root.querySelectorAll('table.Ht')));
    expect(
      registry.querySelectorAllByKey(root, 'composeView.titleBarTd'),
    ).toHaveLength(2);
    expect(
      registry.querySelectorAllByKey(
        document.createElement('div'),
        'composeView.titleBarTable',
      ),
    ).toEqual([]);
  });

  test('candidates are tried in LIST order, not document order', () => {
    const registry = new SelectorRegistry();
    const root = document.createElement('div');
    root.append(composeRoot(false), composeRoot(true));

    // The `Ht`-less table comes first in the document, but its rung is second.
    expect(registry.querySelectorByKey(root, 'composeView.titleBarTable')).toBe(
      root.querySelectorAll('table')[1],
    );
  });

  test('a total miss is null, or a throw naming the key', () => {
    const registry = new SelectorRegistry();
    const empty = document.createElement('div');

    expect(
      registry.querySelectorByKey(empty, 'composeView.titleBarTable'),
    ).toBe(null);
    expect(() =>
      registry.querySelectorByKeyOrFail(empty, 'composeView.titleBarTable'),
    ).toThrow('composeView.titleBarTable');
  });

  test('a key is described by its bundled candidates', () => {
    expect(new SelectorRegistry().describeKey('threadView.idElement')).toBe(
      'threadView.idElement ([data-legacy-thread-id])',
    );
  });
});

describe('with a config loaded', () => {
  test('a key is described with its override candidates first', () => {
    const registry = new SelectorRegistry({
      overrides: { 'threadView.idElement': ['.hotfix'] },
    });

    expect(registry.describeKey('threadView.idElement')).toBe(
      'threadView.idElement (.hotfix || [data-legacy-thread-id])',
    );
  });

  test('an empty config is indistinguishable from no config', () => {
    const registry = new SelectorRegistry({ overrides: {} });
    const root = composeRoot(true);

    expect(registry.querySelectorByKey(root, 'composeView.titleBarTable')).toBe(
      root.querySelector('table'),
    );
  });

  test('an override repairs a key the bundled chain can no longer find', () => {
    const root = document.createElement('div');
    root.innerHTML = '<table class="brand-new"></table>';

    expect(
      new SelectorRegistry().querySelectorByKey(
        root,
        'composeView.titleBarTable',
      ),
    ).toBe(null);

    const registry = new SelectorRegistry({
      overrides: { 'composeView.titleBarTable': ['table.brand-new'] },
    });

    expect(registry.querySelectorByKey(root, 'composeView.titleBarTable')).toBe(
      root.querySelector('table'),
    );
  });

  test('an override that matches nothing cannot break the bundled chain', () => {
    const registry = new SelectorRegistry({
      overrides: { 'composeView.titleBarTable': ['table.matches-nothing'] },
    });
    const root = composeRoot(true);

    expect(registry.querySelectorByKey(root, 'composeView.titleBarTable')).toBe(
      root.querySelector('table'),
    );
  });

  test('an unparseable override is dropped, reported, and inert', () => {
    const onInvalidSelector = jest.fn();
    const registry = new SelectorRegistry({
      overrides: { 'composeView.titleBarTable': ['table['] },
      onInvalidSelector,
    });
    const root = composeRoot(true);

    expect(onInvalidSelector).toHaveBeenCalledWith(
      'composeView.titleBarTable',
      'table[',
    );
    expect(registry.querySelectorByKey(root, 'composeView.titleBarTable')).toBe(
      root.querySelector('table'),
    );
  });

  test('a key from a newer config is a no-op', () => {
    const registry = new SelectorRegistry({
      overrides: { 'composeView.fromTheFuture': ['.x'] } as never,
    });
    const root = composeRoot(true);

    expect(registry.querySelectorByKey(root, 'composeView.titleBarTable')).toBe(
      root.querySelector('table'),
    );
  });

  test('one registry cannot see another registry config', () => {
    const root = document.createElement('div');
    root.innerHTML = '<table class="brand-new"></table>';

    const withOverrides = new SelectorRegistry({
      overrides: { 'composeView.titleBarTable': ['table.brand-new'] },
    });
    const withoutOverrides = new SelectorRegistry();

    expect(
      withOverrides.querySelectorByKey(root, 'composeView.titleBarTable'),
    ).toBe(root.querySelector('table'));
    expect(
      withoutOverrides.querySelectorByKey(root, 'composeView.titleBarTable'),
    ).toBe(null);
  });
});
