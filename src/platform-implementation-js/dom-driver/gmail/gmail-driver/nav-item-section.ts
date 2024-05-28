import autoHtml from 'auto-html';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import { panelNavItemsContainerSelector } from '../../../views/collapsible-panel-view';
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';

export const getSectionClassName = (sectionKey: string) =>
  `inboxsdk__navItem_section_${sectionKey}` as const;

const getSectionListClassName = (sectionKey: string) =>
  `inboxsdk__navItem_section_${sectionKey}_list` as const;
const getSectionListSelector = (sectionKey: string) =>
  `.${getSectionListClassName(sectionKey)}`;

const getSectionItemsClassName = (sectionKey: string) =>
  `inboxsdk__navItem_section_${sectionKey}_list_items` as const;
const getSectionItemsSelector = (sectionKey: string) =>
  `.${getSectionItemsClassName(sectionKey)}`;

export function createSectionNavItemsContainer(
  sectionKey = 'default',
  orderGroup?: string,
  orderHint?: string | number,
  insertionOrderHint?: string | number,
) {
  const element = document.createElement('div');
  const className = getSectionListClassName(sectionKey);
  const itemsClassName = getSectionItemsClassName(sectionKey);

  element.classList.add('yJ', className);
  if (orderGroup) {
    element.setAttribute('data-group-order-hint', orderGroup);
  }
  if (orderHint) {
    element.setAttribute('data-order-hint', orderHint.toString());
  }
  if (insertionOrderHint) {
    element.setAttribute(
      'data-insertion-order-hint',
      insertionOrderHint.toString(),
    );
  }
  const ARIA_LABELLED_BY_ID = Math.random().toFixed(3);

  element.innerHTML = autoHtml`
    <div class="ajl aib aZ6" aria-labelledby="${ARIA_LABELLED_BY_ID}">
      <h2 class="aWk" id="${ARIA_LABELLED_BY_ID}">Labels</h2>
      <div class="wT">
        <div class="n3">
          <div class="byl">
            <div class="TK ${itemsClassName}"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  return element;
}

export function getPanelSectionNavItemContainerElement(
  panelElement: HTMLElement,
) {
  return querySelector(panelElement, panelNavItemsContainerSelector);
}

export function getPanelNavItemContainerElement(
  panelElement: HTMLElement,
  sectionKey = 'default',
  orderGroup?: string,
  orderHint?: string | number,
  insertionOrderHint?: string | number,
) {
  const sectionNavItemsContainer = panelElement.querySelector(
    getSectionListSelector(sectionKey),
  );

  if (!sectionNavItemsContainer) {
    const container = createSectionNavItemsContainer(
      sectionKey,
      orderGroup,
      orderHint,
      insertionOrderHint,
    );
    const panelNavItemsContainer = panelElement.querySelector(
      panelNavItemsContainerSelector,
    ) as HTMLElement;

    if (!panelNavItemsContainer) {
      return panelElement;
    }

    insertElementInOrder(panelNavItemsContainer, container);
  }

  return querySelector(panelElement, getSectionItemsSelector(sectionKey));
}

export function getSectionNavItemsContainerElement(
  sectionElement: HTMLElement,
  sectionKey = 'default',
  orderGroup?: string,
  orderHint?: string | number,
  insertionOrderHint?: string | number,
) {
  const parent = sectionElement.parentElement!;
  const sectionNavItemsContainer = parent.querySelector(
    getSectionListSelector(sectionKey),
  );

  if (!sectionNavItemsContainer) {
    const container = createSectionNavItemsContainer(
      sectionKey,
      orderGroup,
      orderHint,
      insertionOrderHint,
    );

    insertElementInOrder(parent, container);
  }

  return querySelector(parent, getSectionItemsSelector(sectionKey));
}
