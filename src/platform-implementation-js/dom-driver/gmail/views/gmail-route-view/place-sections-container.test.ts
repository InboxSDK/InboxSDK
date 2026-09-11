import SelectorRegistry from '../../../../lib/dom/selectorRegistry';
import placeSectionsContainer from './place-sections-container';

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

function sectionsContainer(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'inboxsdk__custom_sections';
  return container;
}

function toolbarOf(wrapper: HTMLElement): Element {
  const toolbar = wrapper.querySelector('[gh=tm]');
  if (!toolbar) {
    throw new Error('wrapper has no toolbar');
  }
  return toolbar;
}

const registry = new SelectorRegistry();

test('inserts a new container below the displayed toolbar', () => {
  const current = rowListWrapper({ hidden: false, withToolbar: true });
  const main = document.createElement('div');
  main.append(rowListWrapper({ hidden: true, withToolbar: true }), current);
  const container = sectionsContainer();

  expect(placeSectionsContainer(main, container, registry)).toBe(true);
  expect(container.previousSibling).toBe(toolbarOf(current));
});

test('moves a container out of a hidden wrapper to the displayed toolbar', () => {
  const stale = rowListWrapper({ hidden: true, withToolbar: true });
  const current = rowListWrapper({ hidden: false, withToolbar: true });
  const main = document.createElement('div');
  main.append(stale, current);
  const container = sectionsContainer();
  toolbarOf(stale).after(container);

  expect(placeSectionsContainer(main, container, registry)).toBe(true);
  expect(container.previousSibling).toBe(toolbarOf(current));
  expect(stale.contains(container)).toBe(false);
});

test('moves the container to the top while the displayed wrapper has no toolbar', () => {
  const stale = rowListWrapper({ hidden: true, withToolbar: true });
  const main = document.createElement('div');
  main.append(stale, rowListWrapper({ hidden: false, withToolbar: false }));
  const container = sectionsContainer();
  toolbarOf(stale).after(container);

  expect(placeSectionsContainer(main, container, registry)).toBe(false);
  expect(main.firstChild).toBe(container);
});

test('leaves a container that is already in place untouched', () => {
  const current = rowListWrapper({ hidden: false, withToolbar: true });
  const main = document.createElement('div');
  main.append(current);
  const container = sectionsContainer();
  toolbarOf(current).after(container);
  const observer = new MutationObserver(jest.fn());
  observer.observe(main, { childList: true, subtree: true });

  expect(placeSectionsContainer(main, container, registry)).toBe(true);
  expect(observer.takeRecords()).toEqual([]);
  observer.disconnect();
});
