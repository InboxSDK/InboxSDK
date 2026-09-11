import SelectorRegistry from '../../../../lib/dom/selectorRegistry';
import findVisibleListToolbar from './find-visible-list-toolbar';

function rowListWrapper({
  hidden,
  withToolbar,
}: {
  hidden: boolean;
  withToolbar: boolean;
}): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'bGI nH oy8Mbf';
  if (hidden) {
    wrapper.style.display = 'none';
  }
  if (withToolbar) {
    const toolbar = document.createElement('div');
    toolbar.className = 'D E G-atb';
    toolbar.setAttribute('gh', 'tm');
    wrapper.append(toolbar);
  }
  return wrapper;
}

function listContainer(...wrappers: HTMLElement[]): HTMLElement {
  const main = document.createElement('div');
  main.className = 'nH';
  main.append(...wrappers);
  return main;
}

const registry = new SelectorRegistry();

// After inbox -> search, the stale inbox wrapper comes first, toolbar included.
test('skips a hidden wrapper that still has a toolbar', () => {
  const stale = rowListWrapper({ hidden: true, withToolbar: true });
  const current = rowListWrapper({ hidden: false, withToolbar: true });
  const main = listContainer(stale, current);

  expect(findVisibleListToolbar(main, registry)).toBe(
    current.querySelector('[gh=tm]'),
  );
});

test('skips a hidden placeholder wrapper with no toolbar', () => {
  const placeholder = rowListWrapper({ hidden: true, withToolbar: false });
  const current = rowListWrapper({ hidden: false, withToolbar: true });
  const main = listContainer(placeholder, current);

  expect(findVisibleListToolbar(main, registry)).toBe(
    current.querySelector('[gh=tm]'),
  );
});

test('a lone displayed wrapper resolves to its own toolbar', () => {
  const current = rowListWrapper({ hidden: false, withToolbar: true });
  const main = listContainer(current);

  expect(findVisibleListToolbar(main, registry)).toBe(
    current.querySelector('[gh=tm]'),
  );
});

test('null when no wrapper is displayed', () => {
  const main = listContainer(
    rowListWrapper({ hidden: true, withToolbar: true }),
    rowListWrapper({ hidden: true, withToolbar: true }),
  );

  expect(findVisibleListToolbar(main, registry)).toBeNull();
});

test('null when the displayed wrapper has no toolbar', () => {
  const main = listContainer(
    rowListWrapper({ hidden: true, withToolbar: true }),
    rowListWrapper({ hidden: false, withToolbar: false }),
  );

  expect(findVisibleListToolbar(main, registry)).toBeNull();
});

test('null when there is no wrapper at all', () => {
  expect(findVisibleListToolbar(listContainer(), registry)).toBeNull();
});
