import SelectorRegistry from '../../../lib/dom/selectorRegistry';
import type GmailDriver from '../gmail-driver';
import type { SelectorOverrides } from '../selectors';
import GmailToolbarView from './gmail-toolbar-view';

function makeToolbarView(
  toolbarHtml: string,
  overrides?: SelectorOverrides,
): {
  element: HTMLElement;
  view: GmailToolbarView;
} {
  const element = document.createElement('div');
  element.innerHTML = toolbarHtml;

  const view = Object.create(GmailToolbarView.prototype) as GmailToolbarView;
  view._element = element;
  view._driver = {
    selectors: new SelectorRegistry({ overrides }),
  } as GmailDriver;

  return { element, view };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('_getMoveSectionElement', () => {
  test('uses the normal Move and Labels section', () => {
    const { element, view } = makeToolbarView(`
      <div class="G-Ni" data-section="archive"><div class="lR"></div></div>
      <div class="G-Ni" data-section="move">
        <div class="ns"></div><div class="mw"></div>
      </div>
    `);

    expect(view._getMoveSectionElement()).toBe(
      element.querySelector('[data-section="move"]'),
    );
  });

  test('uses the legacy search section through its bq5 icon', () => {
    const { element, view } = makeToolbarView(`
      <div class="G-Ni" data-section="search">
        <div class="aFj"><div class="asa"><div class="bq5"></div></div></div>
      </div>
    `);

    expect(view._getMoveSectionElement()).toBe(
      element.querySelector('[data-section="search"]'),
    );
  });

  test('falls back to the Material search Move-to-Inbox button', () => {
    const { element, view } = makeToolbarView(`
      <div class="G-Ni" data-section="search">
        <div class="aFj">
          <div class="asa KCRnif"><svg class="fphLhb"></svg></div>
        </div>
      </div>
    `);

    expect(view._getMoveSectionElement()).toBe(
      element.querySelector('[data-section="search"]'),
    );
  });

  test('prefers a real Move section after an earlier aFj fallback', () => {
    const { element, view } = makeToolbarView(`
      <div class="G-Ni" data-section="fallback"><div class="aFj"></div></div>
      <div class="G-Ni" data-section="move"><div class="ns"></div></div>
    `);

    expect(view._getMoveSectionElement()).toBe(
      element.querySelector('[data-section="move"]'),
    );
  });

  test('ignores a hidden Move button outside the active toolbar root', () => {
    document.body.innerHTML =
      '<div style="display:none"><div class="G-Ni"><div class="ns"></div></div></div>';
    const { element, view } = makeToolbarView(`
      <div class="G-Ni" data-section="search"><div class="aFj"></div></div>
    `);

    expect(view._getMoveSectionElement()).toBe(
      element.querySelector('[data-section="search"]'),
    );
  });

  test('accepts a remote fallback selector override', () => {
    const { element, view } = makeToolbarView(
      '<div class="G-Ni" data-section="override"><div class="future-move"></div></div>',
      {
        'toolbar.moveSectionFallbackButton': ['.future-move'],
      } as never,
    );

    expect(view._getMoveSectionElement()).toBe(
      element.querySelector('[data-section="override"]'),
    );
  });
});

test('resolves the existing Archive and checkbox sections', () => {
  const { element, view } = makeToolbarView(`
    <div class="G-Ni" data-section="checkbox">
      <div class="T-Jo-auh"></div>
    </div>
    <div class="G-Ni" data-section="archive">
      <div class="lR"></div>
    </div>
  `);

  expect(view._getCheckboxSectionElement()).toBe(
    element.querySelector('[data-section="checkbox"]'),
  );
  expect(view._getArchiveSectionElement()).toBe(
    element.querySelector('[data-section="archive"]'),
  );
});
