import escape from 'lodash/escape';
import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type { Bus } from 'kefir-bus';
import defer from '../../../../common/defer';
import autoHtml from 'auto-html';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import InboxDropdownButtonView from '../widgets/buttons/inbox-dropdown-button-view';
import GmailDropdownView from '../widgets/gmail-dropdown-view';
import DropdownButtonViewController from '../../../widgets/buttons/dropdown-button-view-controller';
import type GmailDriver from '../gmail-driver';
import type {
  LabelDescriptor,
  RowDescriptor,
  SectionDescriptor,
} from '../../../../inboxsdk';
import * as s from './gmail-collapsible-section-view.module.css';

const enum GmailClass {
  titleRight_2015 = 'Cr',
  titleRight_2024_01_25 = 'chp5lb',
  /** Adds en dash before the subtitle */
  subtitle_2018_04_16 = 'aw5',
}

const enum GmailSelector {
  titleRight_2015 = `.${GmailClass.titleRight_2015}`,
  titleRight_2024_01_25 = `.${GmailClass.titleRight_2024_01_25}`,
}

const enum CustomSelector {
  subtitleInsert = '.Wn',
  title_2024_01_29 = 'h3 > .Wn',
}

class GmailCollapsibleSectionView {
  #groupOrderHint: number;
  #isReadyDeferred;
  #isCollapsible: boolean;
  #collapsibleSectionDescriptor: SectionDescriptor = {} as SectionDescriptor;
  #isSearch: boolean;
  #element: HTMLElement | null = null;
  #headerElement: HTMLElement | null = null;
  #titleElement: HTMLElement | null = null;
  #bodyElement: HTMLElement | null = null;
  #contentElement: HTMLElement | null = null;
  #tableBodyElement: HTMLElement | null = null;
  #collapsedContainer: HTMLElement | null = null;
  #messageElement: HTMLElement | null = null;
  #footerElement: HTMLElement | null = null;
  #eventStream: Bus<any, unknown>;
  #isCollapsed: boolean = false;
  #inboxDropdownButtonView: InboxDropdownButtonView | null = null;
  #dropdownViewController: DropdownButtonViewController | null = null;
  #tableRowsUnmountResolution: (() => void) | null = null;

  constructor(
    _driver: GmailDriver,
    groupOrderHint: number,
    isSearch: boolean,
    isCollapsible: boolean,
  ) {
    this.#isSearch = isSearch;
    this.#groupOrderHint = groupOrderHint;
    this.#isCollapsible = isCollapsible;
    this.#eventStream = kefirBus();
    this.#isReadyDeferred = defer();
  }

  destroy() {
    this.#unmountRows();

    this.#element?.remove();
    if (this.#eventStream) this.#eventStream.end();
    this.#headerElement?.remove();
    this.#titleElement?.remove();
    this.#bodyElement?.remove();
    this.#contentElement?.remove();
    this.#tableBodyElement?.remove();
    this.#collapsedContainer?.remove();
    this.#messageElement?.remove();
    this.#inboxDropdownButtonView?.destroy();
    this.#dropdownViewController?.destroy();
  }

  #unmountRows() {
    this.#tableRowsUnmountResolution?.();
    this.#tableRowsUnmountResolution = null;
  }

  getElement(): HTMLElement {
    const element = this.#element;
    if (!element)
      throw new Error('tried to access element that does not exist');
    return element;
  }

  getEventStream() {
    return this.#eventStream;
  }

  setCollapsibleSectionDescriptorProperty(
    collapsibleSectionDescriptorProperty: Kefir.Observable<
      SectionDescriptor | null | undefined,
      unknown
    >,
  ) {
    const stoppedProperty = collapsibleSectionDescriptorProperty.takeUntilBy(
      this.#eventStream.filter(() => false).beforeEnd(() => null),
    );
    stoppedProperty.onValue((x) => this.#updateValues(x));
    stoppedProperty.take(1).onValue(() => this.#isReadyDeferred.resolve(this));
  }

  setCollapsed(value: boolean) {
    if (!this.#isCollapsible) {
      return;
    }

    this.#isReadyDeferred.promise.then(() => {
      if (value) this.#collapse();
      else this.#expand();
    });
  }

  #updateValues(
    collapsibleSectionDescriptor: SectionDescriptor | null | undefined,
  ) {
    const element = this.#element;

    if (!collapsibleSectionDescriptor) {
      if (element) {
        element.style.display = 'none';
      }

      return;
    } else if (element) {
      element.style.display = '';
    }

    if (!element) {
      this.#setupElement(collapsibleSectionDescriptor);

      this.#showLoadingMessage();
    } else {
      this.#updateElement(collapsibleSectionDescriptor);
    }

    this.#updateHeader(collapsibleSectionDescriptor);

    this.#updateTitle(collapsibleSectionDescriptor);

    this.#updateSubtitle(collapsibleSectionDescriptor);

    this.#updateSummaryText(collapsibleSectionDescriptor);

    this.#updateDropdown(collapsibleSectionDescriptor);

    this.#updateContentElement(collapsibleSectionDescriptor);

    this.#updateTableRows(collapsibleSectionDescriptor);

    this.#updateMessageElement(collapsibleSectionDescriptor);

    this.#updateFooter(collapsibleSectionDescriptor);

    this.#collapsibleSectionDescriptor = collapsibleSectionDescriptor;
  }

  #setupElement(collapsibleSectionDescriptor: SectionDescriptor) {
    const element = (this.#element = document.createElement('div'));
    element.setAttribute('class', 'inboxsdk__resultsSection');
    element.setAttribute('data-group-order-hint', String(this.#groupOrderHint));
    element.setAttribute(
      'data-order-hint',
      String(
        typeof collapsibleSectionDescriptor.orderHint === 'number'
          ? collapsibleSectionDescriptor.orderHint
          : 0,
      ),
    );
    if (!this.#isCollapsible)
      element.classList.add('inboxsdk__resultsSection_nonCollapsible');

    this.#setupHeader(collapsibleSectionDescriptor);

    const bodyElement = (this.#bodyElement = document.createElement('div'));
    const bodyContentsElement = document.createElement('div');
    bodyContentsElement.classList.add('zE');
    bodyElement.appendChild(bodyContentsElement);
    element.appendChild(bodyElement);
    const contentElement = (this.#contentElement =
      document.createElement('div'));
    bodyContentsElement.appendChild(contentElement);
    const messageElement = (this.#messageElement =
      document.createElement('div'));
    bodyContentsElement.appendChild(messageElement);
    const tableBodyElement = (this.#tableBodyElement =
      document.createElement('div'));
    bodyContentsElement.appendChild(tableBodyElement);

    this.#setupFooter();

    if (this.#isCollapsible && this.#titleElement) {
      Kefir.fromEvents(this.#titleElement, 'click').onValue(() =>
        this.#toggleCollapseState(),
      );
    }

    Kefir.fromEvents(element, 'removeCollapsedContainer').onValue(() =>
      this.#destroyCollapsedContainer(),
    );
    Kefir.fromEvents(element, 'readdToCollapsedContainer').onValue(() =>
      this.#addToCollapsedContainer(),
    );

    this.#eventStream.emit({
      type: 'update',
      property: 'orderHint',
      sectionDescriptor: collapsibleSectionDescriptor,
    });
  }

  #setupHeader(collapsibleSectionDescriptor: SectionDescriptor) {
    const headerElement = (this.#headerElement = document.createElement('div'));
    headerElement.classList.add('inboxsdk__resultsSection_header', 'Wg');

    this.#setupGmailv2Header(headerElement, collapsibleSectionDescriptor);

    if (this.#element) this.#element.appendChild(headerElement);
  }

  #setupGmailv2Header(
    headerElement: HTMLElement,
    collapsibleSectionDescriptor: SectionDescriptor,
  ) {
    const titleElement = (this.#titleElement = document.createElement('div'));
    titleElement.setAttribute('class', 'inboxsdk__resultsSection_title');
    titleElement.innerHTML = [
      '<h3 class="Wr iR">',
      '<img alt="" src="//ssl.gstatic.com/ui/v1/icons/mail/images/cleardot.gif" class="qi Wp Wq">',
      `<div class="Wn ${s.title}">`,
      escape(collapsibleSectionDescriptor.title),
      '</div>',
      '</h3>',
    ].join('');

    const headerRightElement = document.createElement('div');
    headerRightElement.classList.add(GmailClass.titleRight_2024_01_25);
    headerElement.appendChild(titleElement);
    headerElement.appendChild(headerRightElement);
  }

  #setupFooter() {
    const footerElement = (this.#footerElement = document.createElement('div'));
    footerElement.classList.add('inboxsdk__resultsSection_footer');
    if (this.#bodyElement) this.#bodyElement.appendChild(footerElement);
  }

  #updateElement(collapsibleSectionDescriptor: SectionDescriptor) {
    if (
      this.#collapsibleSectionDescriptor.orderHint !==
      collapsibleSectionDescriptor.orderHint
    ) {
      const element = this.#element;
      if (element)
        element.setAttribute(
          'data-order-hint',
          '' +
            (typeof collapsibleSectionDescriptor.orderHint === 'number'
              ? collapsibleSectionDescriptor.orderHint
              : 0),
        );

      this.#eventStream.emit({
        type: 'update',
        property: 'orderHint',
      });
    }
  }

  #updateHeader(collapsibleSectionDescriptor: SectionDescriptor) {
    if (
      this.#isCollapsible ||
      collapsibleSectionDescriptor.title ||
      collapsibleSectionDescriptor.subtitle ||
      collapsibleSectionDescriptor.titleLinkText ||
      collapsibleSectionDescriptor.hasDropdown
    ) {
      if (this.#headerElement) this.#headerElement.style.display = '';
    } else {
      if (this.#headerElement) this.#headerElement.style.display = 'none';
    }
  }

  #updateTitle(collapsibleSectionDescriptor: SectionDescriptor) {
    if (
      this.#collapsibleSectionDescriptor.title !==
      collapsibleSectionDescriptor.title
    ) {
      if (this.#titleElement) {
        querySelector(
          this.#titleElement,
          CustomSelector.title_2024_01_29,
        ).textContent = collapsibleSectionDescriptor.title!;
      }
    }
  }

  #updateSubtitle(collapsibleSectionDescriptor: SectionDescriptor) {
    const titleElement = this.#titleElement;
    if (!titleElement) return;
    let subtitleElement = titleElement.getElementsByClassName(s.subtitle)[0];

    if (!collapsibleSectionDescriptor.subtitle) {
      if (subtitleElement) {
        subtitleElement.remove();
      }
    } else if (
      this.#collapsibleSectionDescriptor.subtitle !==
      collapsibleSectionDescriptor.subtitle
    ) {
      if (!subtitleElement) {
        subtitleElement = document.createElement('span');

        if (subtitleElement && titleElement) {
          subtitleElement.classList.add(s.subtitle);
          const insertionPoint = titleElement.querySelector(
            CustomSelector.subtitleInsert,
          );

          if (insertionPoint) {
            insertionPoint.prepend(subtitleElement);
          }
        }
      }

      subtitleElement.textContent = collapsibleSectionDescriptor.subtitle;
    }
  }

  #updateSummaryText(collapsibleSectionDescriptor: SectionDescriptor) {
    const headerElement = this.#headerElement;
    if (!headerElement) return;
    let summaryTextElement = headerElement.querySelector(
      '.inboxsdk__resultsSection_header_summaryText',
    );

    if (!collapsibleSectionDescriptor.titleLinkText) {
      if (summaryTextElement) {
        summaryTextElement.remove();
      }
    } else if (
      collapsibleSectionDescriptor.titleLinkText !==
      this.#collapsibleSectionDescriptor.titleLinkText
    ) {
      if (!summaryTextElement) {
        summaryTextElement = document.createElement('div');
        summaryTextElement.setAttribute(
          'class',
          'inboxsdk__resultsSection_header_summaryText Wm',
        );
        summaryTextElement.innerHTML = [
          '<span class="Di">&nbsp;',
          '<div class="J-J5-Ji amH">',
          '<span class="Dj">',
          '<span></span>',
          '</span>',
          '&nbsp;',
          '</div>',
          '</span>',
        ].join('');

        this.#eventStream.plug(
          Kefir.fromEvents(summaryTextElement, 'click').map(() => ({
            eventName: 'titleLinkClicked',
            sectionDescriptor: this.#collapsibleSectionDescriptor,
          })),
        );

        const _summaryTextElement = summaryTextElement;
        summaryTextElement.addEventListener('mouseenter', function () {
          _summaryTextElement.classList.add('aqi');
        });
        summaryTextElement.addEventListener('mouseleave', function () {
          _summaryTextElement.classList.remove('aqi');
        });
        const insertionPoint = headerElement.querySelector(
          GmailSelector.titleRight_2024_01_25,
        );
        if (insertionPoint)
          insertionPoint.insertAdjacentElement(
            'afterbegin',
            summaryTextElement,
          );
      }

      querySelector(summaryTextElement, '.Dj > *').textContent =
        collapsibleSectionDescriptor.titleLinkText;
    }
  }

  #updateDropdown(collapsibleSectionDescriptor: SectionDescriptor) {
    if (
      !collapsibleSectionDescriptor.hasDropdown ||
      !collapsibleSectionDescriptor.onDropdownClick
    ) {
      if (this.#inboxDropdownButtonView)
        this.#inboxDropdownButtonView.destroy();
      if (this.#dropdownViewController) this.#dropdownViewController.destroy();
    } else if (
      collapsibleSectionDescriptor.hasDropdown &&
      collapsibleSectionDescriptor.onDropdownClick
    ) {
      if (!this.#inboxDropdownButtonView || !this.#dropdownViewController) {
        const inboxDropdownButtonView = (this.#inboxDropdownButtonView =
          new InboxDropdownButtonView());
        this.#dropdownViewController = new DropdownButtonViewController({
          buttonView: inboxDropdownButtonView,
          dropdownViewDriverClass: GmailDropdownView,
          dropdownShowFunction: collapsibleSectionDescriptor.onDropdownClick,
        });
        const headerElement = this.#headerElement;

        if (headerElement) {
          const childElement = headerElement.querySelector(
            GmailSelector.titleRight_2024_01_25,
          );
          if (childElement)
            childElement.appendChild(inboxDropdownButtonView.getElement());
        }
      } else if (
        collapsibleSectionDescriptor.onDropdownClick !==
        this.#collapsibleSectionDescriptor.onDropdownClick
      ) {
        if (this.#dropdownViewController)
          this.#dropdownViewController.setDropdownShowFunction(
            collapsibleSectionDescriptor.onDropdownClick,
          );
      }
    }
  }

  #updateContentElement(collapsibleSectionDescriptor: SectionDescriptor) {
    const contentElement = this.#contentElement;
    if (!contentElement) return;
    contentElement.innerHTML = '';

    if (collapsibleSectionDescriptor.contentElement) {
      contentElement.style.display = '';
      contentElement.appendChild(collapsibleSectionDescriptor.contentElement);
    } else {
      contentElement.style.display = 'none';
    }
  }

  #updateTableRows(collapsibleSectionDescriptor: SectionDescriptor) {
    const { tableRows } = collapsibleSectionDescriptor;
    const tableBodyElement = this.#tableBodyElement;
    if (!tableBodyElement) return;
    tableBodyElement.innerHTML = '';

    if (!tableRows || tableRows.length === 0) {
      tableBodyElement.style.display = 'none';
    } else {
      tableBodyElement.style.display = '';

      this.#renderTable(tableRows);
    }
  }

  #renderTable(tableRows: RowDescriptor[]) {
    const tableElement = document.createElement('table');
    tableElement.setAttribute('class', 'F cf zt');
    tableElement.innerHTML = _getTableHTML();
    if (this.#tableBodyElement)
      this.#tableBodyElement.appendChild(tableElement);
    const tbody = tableElement.querySelector('tbody');
    const eventStream = this.#eventStream;
    this.#unmountRows();

    /**
     * @todo use Promise.withResolvers when target ES2024 added to TS.
     */
    const promise = new Promise<void>(
      (res) => (this.#tableRowsUnmountResolution = res),
    );

    for (const result of tableRows) {
      const rowElement = document.createElement('tr');
      const {
        iconHtml,
        isRead = { background: false },
        title: recipients,
        shortDetailText,
        attachmentIcon,
      } = result;
      const useReadBackground =
        (typeof isRead === 'object' && isRead.background) || isRead === true;

      const arbitraryHTMLAndClassName = [
        [iconHtml, s.iconAtStart],
        [recipients, s.recipients],
        ...('snippet' in result ? [[result.snippet, s.snippet] as const] : []),
        [attachmentIcon, s.attachmentIcon],
        [shortDetailText, s.shortDetail],
      ] as const;

      rowElement.setAttribute(
        'class',
        'inboxsdk__resultsSection_tableRow zA ' +
          (useReadBackground ? 'yO' : 'zE'),
      );
      rowElement.innerHTML = _getRowHTML(result);

      for (const [maybeRenderer, className] of arbitraryHTMLAndClassName) {
        if (!maybeRenderer || typeof maybeRenderer === 'string') {
          continue;
        }

        const el = querySelector(rowElement, `.${className}`);

        maybeRenderer({ el, unmountPromise: promise });
      }

      if (!tbody) throw new Error('should not happen');
      tbody.appendChild(rowElement);
      eventStream.plug(
        Kefir.fromEvents(rowElement, 'click').map(() => ({
          eventName: 'rowClicked',
          rowDescriptor: result,
        })),
      );
    }
  }

  #updateMessageElement(collapsibleSectionDescriptor: SectionDescriptor) {
    const messageElement = this.#messageElement;

    if (
      (collapsibleSectionDescriptor.tableRows &&
        collapsibleSectionDescriptor.tableRows.length > 0) ||
      collapsibleSectionDescriptor.contentElement
    ) {
      if (messageElement) {
        messageElement.innerHTML = '';
        messageElement.style.display = 'none';
      }
    } else if (
      collapsibleSectionDescriptor.tableRows &&
      collapsibleSectionDescriptor.tableRows.length === 0 &&
      !collapsibleSectionDescriptor.contentElement
    ) {
      this.#showEmptyMessage();
    }
  }

  #showLoadingMessage() {
    const messageElement = this.#messageElement;

    if (messageElement) {
      messageElement.setAttribute(
        'class',
        'TB TC inboxsdk__resultsSection_loading',
      );
      messageElement.innerHTML = 'loading...'; //TODO: localize

      messageElement.style.display = '';
    }
  }

  #showEmptyMessage() {
    const messageElement = this.#messageElement;

    if (messageElement) {
      messageElement.setAttribute('class', 'TB TC');
      messageElement.innerHTML = 'No results found'; //TODO: localize

      messageElement.style.display = '';
    }
  }

  #updateFooter(collapsibleSectionDescriptor: SectionDescriptor) {
    const footerElement = this.#footerElement;
    if (!footerElement) return;
    footerElement.innerHTML = '';

    if (
      !collapsibleSectionDescriptor.footerLinkText &&
      !collapsibleSectionDescriptor.footerLinkIconUrl &&
      !collapsibleSectionDescriptor.footerLinkIconClass
    ) {
      footerElement.style.display = 'none';
    } else {
      footerElement.style.display = '';
      const footerLinkElement = document.createElement('span');
      footerLinkElement.setAttribute('class', 'e Wb');
      footerLinkElement.textContent =
        collapsibleSectionDescriptor.footerLinkText!;

      this.#eventStream.plug(
        Kefir.fromEvents(footerLinkElement, 'click').map(() => {
          return {
            eventName: 'footerClicked',
            sectionDescriptor: this.#collapsibleSectionDescriptor,
          };
        }),
      );

      footerElement.appendChild(footerLinkElement);
      footerElement.insertAdjacentHTML('beforeend', '<br style="clear:both;">');
    }
  }

  #toggleCollapseState() {
    if (this.#isCollapsed) {
      this.#expand();
    } else {
      this.#collapse();
    }
  }

  #collapse() {
    const element = this.#element;

    if (!element) {
      return;
    }

    element.classList.add('inboxsdk__resultsSection_collapsed');

    if (!this.#isSearch) {
      this.#addToCollapsedContainer();
    }

    const selector = 'h3 > img.Wp';

    if (this.#titleElement) {
      const arrowSpan = querySelector(this.#titleElement, selector);

      if (arrowSpan) {
        arrowSpan.classList.remove('Wq');
        arrowSpan.classList.add('Wo');
      }
    }

    if (this.#bodyElement) this.#bodyElement.style.display = 'none';
    this.#isCollapsed = true;

    this.#eventStream.emit({
      eventName: 'collapsed',
    });
  }

  #expand() {
    const element = this.#element;

    if (!element) {
      return;
    }

    element.classList.remove('inboxsdk__resultsSection_collapsed');

    if (!this.#isSearch) {
      this.#removeFromCollapsedContainer();
    }

    const selector = 'h3 > img.Wp';

    if (this.#titleElement) {
      const arrowSpan = querySelector(this.#titleElement, selector);

      if (arrowSpan) {
        arrowSpan.classList.remove('Wo');
        arrowSpan.classList.add('Wq');
      }
    }

    if (this.#bodyElement) this.#bodyElement.style.display = '';
    this.#isCollapsed = false;

    this.#eventStream.emit({
      eventName: 'expanded',
    });
  }

  #addToCollapsedContainer() {
    const element = this.#element;
    if (!element) return;

    if (
      this.#isCollapsedContainer(element.previousElementSibling) &&
      this.#isCollapsedContainer(element.nextElementSibling)
    ) {
      //we are surrounded by collapse containers, let's favor our previous sibling
      const otherCollapseContainer = element.nextElementSibling;
      const previousSibling = element.previousElementSibling;
      if (!previousSibling) throw new Error('previousSibling does not exist');
      if (!otherCollapseContainer)
        throw new Error('otherCollapseContainer does not exist');
      previousSibling.children[0].appendChild(element);
      //now we need to "merge" the two collapse containers. This can be done by taking all the result sections out of the collapsed container
      //and calling our "recollapse" helper function on them
      const elementsToRecollapse = Array.from(
        otherCollapseContainer.children[0].children,
      ).concat(Array.from(otherCollapseContainer.children[1].children));
      if (otherCollapseContainer)
        this.#pulloutSectionsFromCollapsedContainer(otherCollapseContainer);

      this.#recollapse(elementsToRecollapse);
    } else {
      this.#readdToCollapsedContainer();
    }
  }

  #removeFromCollapsedContainer() {
    const element = this.#element;
    if (!element) return;
    const parentElement = element.parentElement;
    if (!parentElement) return;
    const container = parentElement.parentElement;

    if (
      !container ||
      !container.classList.contains('inboxsdk__results_collapsedContainer')
    ) {
      return;
    }

    const elementsToRecollapse = Array.from(
      container.children[0].children,
    ).concat(Array.from(container.children[1].children));

    this.#pulloutSectionsFromCollapsedContainer(container);

    this.#destroyCollapsedContainer();

    this.#recollapse(elementsToRecollapse.filter((child) => child !== element));
  }

  #pulloutSectionsFromCollapsedContainer(container: Element) {
    const prependedChildren = Array.from(container.children[0].children);
    prependedChildren.forEach((child) =>
      container.insertAdjacentElement('beforebegin', child),
    );
    const appendedChildren = Array.from(
      container.children[1].children,
    ).reverse();
    appendedChildren.forEach((child) =>
      container.insertAdjacentElement('afterend', child),
    );
  }

  #readdToCollapsedContainer() {
    const element = this.#element;
    if (!element) return;

    if (this.#collapsedContainer) {
      this.#collapsedContainer.children[0].insertBefore(
        element,
        this.#collapsedContainer.children[1].firstElementChild,
      );

      return;
    }

    let collapsedContainer;
    let isPrepend;

    if (this.#isCollapsedContainer(element.previousElementSibling)) {
      isPrepend = false;
      collapsedContainer = element.previousElementSibling;
    } else if (this.#isCollapsedContainer(element.nextElementSibling)) {
      isPrepend = true;
      collapsedContainer = element.nextElementSibling;
    } else {
      isPrepend = true;

      this.#createCollapsedContainer();

      collapsedContainer = this.#collapsedContainer;
    }

    if (isPrepend && collapsedContainer) {
      collapsedContainer.children[0].insertBefore(
        element,
        collapsedContainer.children[0].firstElementChild,
      );
    } else if (collapsedContainer) {
      collapsedContainer.children[0].appendChild(element);
    }
  }

  #isCollapsedContainer(element: Element | null) {
    return (
      element &&
      element.classList.contains('inboxsdk__results_collapsedContainer')
    );
  }

  #recollapse(children: Element[]) {
    children.forEach((child) => {
      const removeEvent = document.createEvent('CustomEvent');
      removeEvent.initCustomEvent(
        'removeCollapsedContainer',
        false,
        false,
        null,
      );
      child.dispatchEvent(removeEvent);
      const readdEvent = document.createEvent('CustomEvent');
      readdEvent.initCustomEvent(
        'readdToCollapsedContainer',
        false,
        false,
        null,
      );
      child.dispatchEvent(readdEvent);
    });
  }

  #createCollapsedContainer() {
    const collapsedContainer = (this.#collapsedContainer =
      document.createElement('div'));
    collapsedContainer.setAttribute(
      'class',
      'inboxsdk__results_collapsedContainer Wg',
    );
    collapsedContainer.innerHTML =
      '<div class="inboxsdk__results_collapsedContainer_prepend"></div><div class="inboxsdk__results_collapsedContainer_append"></div>';
    const element = this.#element;
    if (element) element.insertAdjacentElement('afterend', collapsedContainer);
  }

  #destroyCollapsedContainer() {
    if (this.#collapsedContainer) {
      this.#collapsedContainer.remove();

      this.#collapsedContainer = null;
    }
  }
}

function _getTableHTML() {
  return [
    '<colgroup>',
    '<col class="k0vOLb">',
    '<col class="Ci">',
    '<col class="y5">',
    '<col class="WA">',
    '<col class="yY">',
    '<col>',
    '<col class="xX">',
    '</colgroup>',
    '<tbody>',
    '</tbody>',
  ].join('');
}

function _getRowHTML(result: RowDescriptor) {
  let iconHtml = '';

  if (result.iconHtml != null && typeof result.iconHtml === 'string') {
    iconHtml = autoHtml`<div class="inboxsdk__resultsSection_result_icon inboxsdk__resultsSection_result_iconHtml">
        ${{
          __html: result.iconHtml,
        }}
      </div>`;
  } else if (result.iconUrl) {
    iconHtml = autoHtml`<img class="inboxsdk__resultsSection_result_icon ${
      result.iconClass || ''
    }" src="${result.iconUrl}">`;
  } else if (result.iconClass)
    iconHtml = autoHtml`<div class="${result.iconClass}"></div>`;

  const labelsHtml = Array.isArray(result.labels)
    ? result.labels.map(_getLabelHTML).join('')
    : '';
  const { isRead = { text: true }, title, shortDetailText } = result;
  const useReadText =
    (typeof isRead === 'object' && isRead.text) || result.isRead === true;
  const rowArr = [
    '<td class="xY PF"></td>',
    `<td class="xY oZ-x3 ${s.iconAtStart}">`,
    iconHtml,
    '</td>',
    // Native Gmail thread rows include this '<td class="xY WA"></td>',
    // and this '<td class="xY WA"></td>',
    `<td class="xY yX ${s.resultTitle}">`,
    '<div class="yW">',
    `<span class="${s.recipients}${useReadText ? '' : ' zF'}">`,
    ...(typeof title === 'string' ? [escape(title)] : []),
    '</span>',
    '</div>',
    '</td>',
    '<td class="xY a4W">',
    '<div class="xS">',
    '<div class="xT">',
    '<div class="yi">',
    labelsHtml,
    '</div>',
    `<div class="y6 ${s.snippet}">`,
    '<span class="bog">',
    useReadText ? '' : '<b>',
    escape(('body' in result && result.body) || ''),
    useReadText ? '' : '</b>',
    '</span>',
    '</div>',
    `<div class="${s.attachmentIcon}"></div>`,
    '</div>',
    '</div>',
    '</td>',
    '<td class="xY xW">',
    `<span class="${s.shortDetail}${useReadText ? '' : ' bq3'}">`,
    ...(typeof shortDetailText === 'string' ? [escape(shortDetailText)] : []),
    '</span>',
    '</td>',
  ];
  return rowArr.join('');
}

function _getLabelHTML(label: LabelDescriptor) {
  const backgroundColor = label.backgroundColor || 'rgb(194, 194, 194)'; //grey

  const foregroundColor = label.foregroundColor || 'rgb(255, 255, 255)'; //white

  const maxWidth = label.maxWidth || '90px';
  const retArray = [
    autoHtml`<div class="ar as" data-tooltip="${label.title!}">
      <div class="at" style="background-color: ${backgroundColor}; border-color: ${backgroundColor};">
        <div class="au" style="border-color: ${backgroundColor};">`,
  ];
  const styleHtml = label.iconBackgroundColor
    ? autoHtml`style="background-color: ${label.iconBackgroundColor}"`
    : '';

  if (label.iconHtml != null) {
    retArray.push(autoHtml`<div class="inboxsdk__resultsSection_label_icon inboxsdk__resultsSection_label_iconHtml"
        ${{
          __html: styleHtml,
        }}
      >
        ${{
          __html: label.iconHtml,
        }}
      </div>`);
  } else if (label.iconClass) {
    retArray.push(autoHtml`<div
        class="inboxsdk__resultsSection_label_icon ${label.iconClass || ''}"
        ${{
          __html: styleHtml,
        }}
        >
      </div>`);
  } else if (label.iconUrl) {
    retArray.push(autoHtml`<img
        class="inboxsdk__resultsSection_label_icon"
        ${{
          __html: styleHtml,
        }}
        src="${label.iconUrl}" />`);
  }

  retArray.push(autoHtml`
          <div class="av" style="color: ${foregroundColor}; max-width: ${maxWidth}">
            ${label.title!}
          </div>
        </div>
      </div>
    </div>
    `);
  return retArray.join('');
}

export default GmailCollapsibleSectionView;
