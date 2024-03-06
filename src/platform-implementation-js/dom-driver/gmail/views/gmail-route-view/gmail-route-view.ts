import includes from 'lodash/includes';
import last from 'lodash/last';
import once from 'lodash/once';
import * as Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import kefirBus from 'kefir-bus';
import type { Bus } from 'kefir-bus';
import { parse } from 'querystring';
import asap from 'asap';
import makeElementChildStream from '../../../../lib/dom/make-element-child-stream';
import makeElementViewStream from '../../../../lib/dom/make-element-view-stream';
import makeMutationObserverChunkedStream from '../../../../lib/dom/make-mutation-observer-chunked-stream';
import getInsertBeforeElement from '../../../../lib/dom/get-insert-before-element';
import GmailRowListView from '../gmail-row-list-view';
import GmailThreadView from '../gmail-thread-view';
import GmailCollapsibleSectionView from '../gmail-collapsible-section-view';
import GmailElementGetter from '../../gmail-element-getter';
import { simulateClick } from '../../../../lib/dom/simulate-mouse-event';
import type GmailDriver from '../../gmail-driver';
import type GmailRouteProcessor from '../gmail-route-view/gmail-route-processor';
import PageParserTree from 'page-parser-tree';
import { makePageParser } from './page-parser';
import toItemWithLifetimeStream from '../../../../lib/toItemWithLifetimeStream';
import waitFor from '../../../../lib/wait-for';
import { SelectorError } from '../../../../lib/dom/querySelectorOrFail';
import isStreakAppId from '../../../../lib/isStreakAppId';
import { extractDocumentHtmlAndCss } from '../../../../../common/extractDocumentHtmlAndCss';
import { type SectionDescriptor } from '../../../../../inboxsdk';
import type { RouteViewDriver } from '../../../../driver-interfaces/route-view-driver';

class GmailRouteView implements RouteViewDriver {
  _type: string;
  _hash: string;
  _name: string;
  _paramsArray: string[];
  _customRouteID: string | null | undefined;
  _stopper = kefirStopper();
  _rowListViews: GmailRowListView[];
  _gmailRouteProcessor: GmailRouteProcessor;
  #driver: GmailDriver;
  _eventStream: Bus<
    | { eventName: 'newGmailRowListView'; view: GmailRowListView }
    | {
        eventName: 'newGmailThreadView';
        view: GmailThreadView;
      },
    unknown
  >;
  _customViewElement: HTMLElement | null | undefined;
  _threadView: GmailThreadView | null | undefined;
  _hasAddedCollapsibleSection: boolean;
  _cachedRouteData: Record<string, any>;
  #page: PageParserTree;
  #destroyed = false;

  constructor(
    { urlObject, type, routeID, cachedRouteData }: Record<string, any>,
    gmailRouteProcessor: GmailRouteProcessor,
    driver: GmailDriver,
  ) {
    this._type = type;
    this._hash = urlObject.hash;
    this._name = urlObject.name;
    this._paramsArray = urlObject.params;
    this._customRouteID = routeID;
    this._cachedRouteData = cachedRouteData;
    this._stopper = kefirStopper();
    this._rowListViews = [];
    this._gmailRouteProcessor = gmailRouteProcessor;
    this.#driver = driver;
    this._eventStream = kefirBus();
    this._hasAddedCollapsibleSection = false;
    this.#page = makePageParser(document.body, driver.getLogger());

    if (this._type === 'CUSTOM') {
      this._setupCustomViewElement();

      driver
        .getStopper()
        .takeUntilBy(this._stopper.delay(0))
        .onValue(() => {
          driver.showNativeRouteView();
          window.location.hash = '#inbox';
        });
    } else if (includes(['NATIVE', 'CUSTOM_LIST'], this._type)) {
      this._setupSubViews();
    }

    if (this._type === 'CUSTOM_LIST') {
      Kefir.later(500, undefined)
        .takeUntilBy(this._stopper)
        .onValue(async () => {
          await this.#waitForMainElementSafe();

          var last = driver.getLastCustomThreadListActivity();

          if (
            !last ||
            last.customRouteID !== this._customRouteID ||
            Date.now() - (last.timestamp as unknown as number) > 5000
          ) {
            this.refresh();
          }
        });
    }
  }

  destroy() {
    this.#destroyed = true;

    this._stopper.destroy();

    this._eventStream.end();
    this.#page.dump();

    if (this._customViewElement) {
      this._customViewElement.remove();
    }

    var rowListViews = this._rowListViews;
    this._rowListViews = [];
    rowListViews.forEach((view) => {
      view.destroy();
    });

    if (this._threadView) {
      this._threadView.destroy();

      this._threadView = null;
    }
  }

  getHash(): string {
    return this._hash;
  }

  getEventStream() {
    return this._eventStream;
  }

  getStopper() {
    return this._stopper;
  }

  getCustomViewElement(): HTMLElement | null | undefined {
    return this._customViewElement;
  }

  getRowListViews(): GmailRowListView[] {
    return this._rowListViews;
  }

  getThreadView(): GmailThreadView | null | undefined {
    return this._threadView;
  }

  getType(): string {
    if (this._type === 'OTHER_APP_CUSTOM') {
      return 'CUSTOM';
    } else {
      return this._type;
    }
  }

  isCustomRouteBelongingToApp(): boolean {
    return this._type === 'CUSTOM';
  }

  getParams: () => Record<string, string> = once(() => {
    let params: any;

    if (this._customRouteID) {
      params = this._getCustomParams();
    } else {
      params = this._getNativeParams();
      const routeID = this.getRouteID();

      if (routeID) {
        const routeIDParams = this._extractParamKeysFromRouteID(routeID);

        const routeParams: any = {};
        routeIDParams.forEach(function (param) {
          if (params[param]) {
            routeParams[param] = params[param];
          }
        });
        params = routeParams;
      }
    }

    return Object.freeze(params);
  });

  addCollapsibleSection(
    sectionDescriptorProperty: Kefir.Observable<
      SectionDescriptor | null | undefined,
      unknown
    >,
    groupOrderHint: number,
  ): GmailCollapsibleSectionView {
    return this.#addCollapsibleSection(
      sectionDescriptorProperty,
      groupOrderHint,
      true,
    );
  }

  addSection(
    sectionDescriptorProperty: Kefir.Observable<
      SectionDescriptor | null | undefined,
      unknown
    >,
    groupOrderHint: number,
  ): GmailCollapsibleSectionView {
    return this.#addCollapsibleSection(
      sectionDescriptorProperty,
      groupOrderHint,
      false,
    );
  }

  #addCollapsibleSection(
    collapsibleSectionDescriptorProperty: Kefir.Observable<
      SectionDescriptor | null | undefined,
      unknown
    >,
    groupOrderHint: number,
    isCollapsible: boolean,
  ): GmailCollapsibleSectionView {
    this._hasAddedCollapsibleSection = true;
    var gmailResultsSectionView = new GmailCollapsibleSectionView(
      this.#driver,
      groupOrderHint,
      this.getRouteID() === this._gmailRouteProcessor.NativeRouteIDs.SEARCH,
      isCollapsible,
    );

    Kefir.combine([
      this.#getSectionsContainer(),
      gmailResultsSectionView.eventStream.filter((event) => {
        return (
          'type' in event &&
          event.type === 'update' &&
          event.property === 'orderHint'
        );
      }),
    ]).onValue(([sectionsContainer]) => {
      const children = sectionsContainer.children;
      const insertBeforeElement = getInsertBeforeElement(
        gmailResultsSectionView.getElement(),
        children,
        ['data-group-order-hint', 'data-order-hint'],
      );

      if (insertBeforeElement) {
        sectionsContainer.insertBefore(
          gmailResultsSectionView.getElement(),
          insertBeforeElement,
        );
      } else {
        sectionsContainer.appendChild(gmailResultsSectionView.getElement());
      }
    });
    gmailResultsSectionView.setCollapsibleSectionDescriptorProperty(
      collapsibleSectionDescriptorProperty,
    );
    return gmailResultsSectionView;
  }

  _setupCustomViewElement() {
    this._customViewElement = document.createElement('div');

    this._customViewElement.classList.add('inboxsdk__custom_view_element');

    this._monitorLeftNavHeight();

    this._setCustomViewElementHeight();
  }

  _monitorLeftNavHeight() {
    var leftNav = GmailElementGetter.getLeftNavHeightElement();

    if (!leftNav) {
      return;
    }

    makeMutationObserverChunkedStream(leftNav, {
      attributes: true,
      attributeFilter: ['style'],
    })
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._setCustomViewElementHeight();
      });
  }

  _setCustomViewElementHeight() {
    const leftNav = GmailElementGetter.getLeftNavHeightElement();
    const gtalkButtons = GmailElementGetter.getGtalkButtons();
    const customViewEl = this._customViewElement;
    if (!leftNav || !customViewEl) throw new Error('Should not happen');
    const contentSectionElement = GmailElementGetter.getContentSectionElement();
    const contentSectionElementBottomMargin = contentSectionElement
      ? parseInt(getComputedStyle(contentSectionElement).marginBottom, 10)
      : 0;
    customViewEl.style.height = `${
      parseInt(leftNav.style.height, 10) +
      (gtalkButtons ? gtalkButtons.offsetHeight : 0) -
      contentSectionElementBottomMargin
    }px`;
  }

  _setupSubViews() {
    asap(async () => {
      if (!this._eventStream) return;

      await this.#waitForMainElementSafe();

      this.#monitorRowListElements();
      this.#setupContentAndSidebarView();
      this._setupScrollStream();
    });
  }

  async #waitForMainElementSafe() {
    try {
      // role=main attribute is not set while page in a loading state
      await waitFor(() => document.querySelector('[role=main]'), 15_000);
    } catch {
      this.#driver.getLogger().error(new SelectorError('[role=main]'), {
        html: extractDocumentHtmlAndCss(),
      });
    }
  }

  #monitorRowListElements() {
    toItemWithLifetimeStream(this.#page.tree.getAllByTag('rowListElement'))
      .takeUntilBy(this._stopper)
      .onValue(({ el }) => {
        this._processRowListElement(el.getValue());
      });
  }

  _processRowListElement(rowListElement: HTMLElement) {
    var rootElement = rowListElement.parentElement;
    if (!rootElement) throw new Error('no rootElement');
    var gmailRowListView = new GmailRowListView(
      rootElement,
      this,
      this.#driver,
    );

    this._rowListViews.push(gmailRowListView);

    this._eventStream.emit({
      eventName: 'newGmailRowListView',
      view: gmailRowListView,
    });
  }

  async #setupContentAndSidebarView() {
    const parseResult = await this.#waitForThreadContainerSafe();

    if (this.#destroyed) {
      return;
    }

    if (parseResult?.threadContainerElement) {
      var gmailThreadView = new GmailThreadView(
        parseResult.threadContainerElement,
        this,
        this.#driver,
      );
      this._threadView = gmailThreadView;

      this._eventStream.emit({
        eventName: 'newGmailThreadView',
        view: gmailThreadView,
      });
    } else if (parseResult?.previewPaneContainerElement) {
      this.#startMonitoringPreviewPaneForThread(
        parseResult.previewPaneContainerElement,
      );
    } else {
      // if neither container element was found, then the page only shows thread rows
      // (or error will be logged in #waitForThreadContainerSafe)
    }
  }

  async #waitForThreadContainerSafe() {
    let parseResult: {
      threadContainerElement?: HTMLElement;
      previewPaneContainerElement?: HTMLElement;
    } | null = null;

    try {
      // additionally to page loading state, gmail might render content asynchronously
      // wait until any of the content container elements appear in the DOM
      parseResult = await waitFor(() => {
        if (this.#destroyed) {
          return {};
        }

        const threadContainerElement = this._getThreadContainerElement();
        if (threadContainerElement) {
          return { threadContainerElement };
        }

        const previewPaneContainerElement =
          GmailElementGetter.getPreviewPaneContainerElement();
        if (previewPaneContainerElement) {
          return { previewPaneContainerElement };
        }

        return null;
      }, 15_000);
    } catch {
      // not found error is logged below
    }

    if (parseResult === null) {
      // check if the page contains list of thread rows
      const viewWithRows =
        this.#page.tree.getAllByTag('rowListElement').values().size > 0;

      const readingPaneDisabled = !document.querySelector(
        '.bGI[role=main] .Nu.S3.aZ6',
      );

      if (viewWithRows && readingPaneDisabled) {
        // (.aia) element is not present when reading pane is disabled in Gmail settings
        // avoid logging not found error in this case
      } else {
        const error = new Error("Thread container element wasn't found");
        if (isStreakAppId(this.#driver.getAppId())) {
          this.#driver.getLogger().error(error, {
            html: extractDocumentHtmlAndCss(),
          });
        }
      }
    }

    return parseResult;
  }

  _setupScrollStream() {
    const SCROLL_DEBOUNCE_MS = 100;
    const scrollContainer = GmailElementGetter.getScrollContainer();
    const { scrollTop: cachedScrollTop } = this._cachedRouteData;

    if (scrollContainer && this._hasAddedCollapsibleSection) {
      if (cachedScrollTop) {
        scrollContainer.scrollTop = cachedScrollTop;
      }

      Kefir.fromEvents<any, unknown>(scrollContainer, 'scroll')
        .throttle(SCROLL_DEBOUNCE_MS)
        .map((e) => e.target.scrollTop)
        .takeUntilBy(this._stopper)
        .onValue((scrollTop) => {
          this._cachedRouteData.scrollTop = scrollTop;
        });
    }
  }

  async #startMonitoringPreviewPaneForThread(
    previewPaneContainer: HTMLElement,
  ) {
    let threadContainerElement: HTMLElement | 'destroyed';

    const selector = 'table.Bs > tr';
    const selector_2023_11_30 = '.ao9:has(.a98.iY, .apa)';

    try {
      threadContainerElement = await waitFor(() => {
        if (this.#destroyed) {
          return 'destroyed';
        }

        const threadContainerElement =
          previewPaneContainer.querySelector<HTMLElement>(selector);

        if (threadContainerElement) {
          return threadContainerElement;
        }

        return previewPaneContainer.querySelector<HTMLElement>(
          selector_2023_11_30,
        );
      }, 15_000);
    } catch {
      const selectorError = new SelectorError(
        `${selector}, ${selector_2023_11_30}`,
        {
          cause: new Error("Thread container for preview pane wasn't found"),
        },
      );
      if (isStreakAppId(this.#driver.getAppId())) {
        this.#driver.getLogger().error(selectorError, {
          html: extractDocumentHtmlAndCss(),
        });
      }

      throw selectorError;
    }

    if (threadContainerElement === 'destroyed') {
      return;
    }

    const elementStream = makeElementChildStream(threadContainerElement).filter(
      (event) => event.el.matches('.a98.iY'),
    );

    this._eventStream.plug(
      elementStream
        .flatMap(
          makeElementViewStream(
            (element) => new GmailThreadView(element, this, this.#driver, true),
          ),
        )
        .map((view) => {
          this._threadView = view;
          return {
            eventName: 'newGmailThreadView',
            view: view,
          };
        }),
    );
  }

  #getSectionsContainer(): Kefir.Observable<HTMLElement, never> {
    return toItemWithLifetimeStream(
      this.#page.tree.getAllByTag('rowListElementContainer'),
    )
      .takeUntilBy(this._stopper)
      .take(1)
      .map(({ el }) => {
        const main = el.getValue();
        let sectionsContainer = main.querySelector<HTMLElement>(
          '.inboxsdk__custom_sections',
        );

        if (!sectionsContainer) {
          sectionsContainer = document.createElement('div');
          sectionsContainer.classList.add('inboxsdk__custom_sections');
          main.insertBefore(sectionsContainer, main.firstChild);
        } else if (
          sectionsContainer.classList.contains('Wc') &&
          !this._isSearchRoute()
        ) {
          sectionsContainer.classList.remove('Wc');
        }
        return sectionsContainer;
      })
      .toProperty();
  }

  _getCustomParams(): Record<string, any> {
    var params: Record<string, any> = Object.create(null);
    if (!this._customRouteID)
      throw new Error(
        "Should not happen, can't get custom params for non-custom view",
      );

    this._customRouteID
      .split('/')
      .slice(1)
      .forEach((part, index) => {
        if (part[0] !== ':') {
          return;
        }

        part = part.substring(1);

        if (this._paramsArray[index]) {
          params[part] = this._paramsArray[index];
        }
      });

    return params;
  }

  _getNativeParams(): Record<string, any> {
    if (this._isSearchRoute()) {
      return this._getSearchRouteParams();
    } else if (this._isListRoute()) {
      return this._getListRouteParams();
    } else if (this._isThreadRoute()) {
      return this._getThreadRouteParams();
    } else if (this._isSettingsRoute()) {
      return this._getSettingsRouteParams();
    }

    return {};
  }

  _isSearchRoute(): boolean {
    return (
      this.getRouteID() === this._gmailRouteProcessor.NativeRouteIDs.SEARCH
    );
  }

  /* FEB 2023 */
  _isChatWelcomeRoute(): boolean {
    return this._hash === this._gmailRouteProcessor.NativeRouteIDs.CHAT_WELCOME;
  }

  _isChatDmRoute(): boolean {
    return (
      this._name === 'chat' &&
      this._paramsArray?.[0] === 'dm' &&
      !!this._paramsArray?.[1]
    );
  }

  _isSpacesWelcomeRoute(): boolean {
    return (
      this._hash === this._gmailRouteProcessor.NativeRouteIDs.SPACES_WELCOME
    );
  }

  _isSpaceRoute(): boolean {
    return (
      this._name === 'chat' &&
      this._paramsArray?.[0] === 'space' &&
      !!this._paramsArray?.[1]
    );
  }

  _isMeetRoute(): boolean {
    return this._hash === this._gmailRouteProcessor.NativeRouteIDs.MEET;
  }

  /* end FEB 2023 */
  getRouteType(): string {
    if (includes(['CUSTOM', 'OTHER_APP_CUSTOM'], this._type)) {
      return this._gmailRouteProcessor.RouteTypes.CUSTOM;
    } else if (this._isListRoute()) {
      return this._gmailRouteProcessor.RouteTypes.LIST;
    } else if (this._isThreadRoute()) {
      return this._gmailRouteProcessor.RouteTypes.THREAD;
    } else if (this._isSettingsRoute()) {
      return this._gmailRouteProcessor.RouteTypes.SETTINGS;
    } else if (this._isChatWelcomeRoute() || this._isChatDmRoute()) {
      return this._gmailRouteProcessor.RouteTypes.CHAT;
    } else if (this._isSpacesWelcomeRoute() || this._isSpaceRoute()) {
      return this._gmailRouteProcessor.RouteTypes.SPACE;
    } else if (this._isMeetRoute()) {
      return this._gmailRouteProcessor.RouteTypes.MEET;
    }

    return this._gmailRouteProcessor.RouteTypes.UNKNOWN;
  }

  _isThreadRoute(): boolean {
    return !!this._getThreadContainerElement();
  }

  _isListRoute(): boolean {
    return (
      (this._type === 'CUSTOM_LIST' ||
        this._gmailRouteProcessor.isListRouteName(this._name)) &&
      // this case is for when you're on a THREAD route, but the thread renders a list like our thread breaker does
      !this._isThreadRoute()
    );
  }

  _isSettingsRoute(): boolean {
    return this._gmailRouteProcessor.isSettingsRouteName(this._name);
  }

  _getSearchRouteParams(): Record<string, any> {
    return {
      query: this._paramsArray[0],
      includesDriveResults: this._name === 'apps',
      page: this._getPageParam(),
    };
  }

  _getListRouteParams(): Record<string, any> {
    var params: Record<string, any> = {
      page: this._getPageParam(),
    };

    if (
      this.getRouteID() === this._gmailRouteProcessor.NativeRouteIDs.LABEL &&
      this._paramsArray[0]
    ) {
      params.labelName = this._paramsArray[0];
    }

    return params;
  }

  _getThreadRouteParams(): Record<string, any> {
    if (this._paramsArray && this._paramsArray.length > 0) {
      const threadID = last(this._paramsArray);

      if (
        threadID &&
        (threadID.length === 16 || //for old hex style
          threadID[0] === '#') //new sync style thread id
      ) {
        return {
          threadID: threadID.replace('#', ''),
        };
      }
    }

    const threadContainerElement = this._getThreadContainerElement();

    let threadID;

    if (threadContainerElement) {
      try {
        threadID = this.#driver
          .getPageCommunicator()
          .getCurrentThreadID(threadContainerElement);
      } catch (err) {
        // leave threadID null to be set below
      }
    }

    if (!threadID) {
      // Happens if gmonkey isn't available, like on a standalone thread page.
      threadID = parse(document.location.search, null!, null!).th || '';
    }

    return {
      threadID,
    };
  }

  _getSettingsRouteParams(): Record<string, any> {
    return {
      tabName: this._paramsArray[0],
    };
  }

  _getPageParam(): number {
    for (var ii = 1; ii < this._paramsArray.length; ii++) {
      if (this._paramsArray[ii].match(/p\d+/)) {
        return parseInt(this._paramsArray[ii].replace(/[a-zA-Z]/, ''), 10);
      }
    }

    return 1;
  }

  getRouteID(): string {
    if (this._customRouteID) {
      return this._customRouteID;
    } else if (this._isThreadRoute()) {
      return this._gmailRouteProcessor.NativeRouteIDs.THREAD;
    } else if (this._isChatWelcomeRoute()) {
      return this._gmailRouteProcessor.NativeRouteIDs.CHAT_WELCOME;
    } else if (this._isChatDmRoute()) {
      return this._gmailRouteProcessor.NativeRouteIDs.CHAT_DM;
    } else if (this._isSpacesWelcomeRoute()) {
      return this._gmailRouteProcessor.NativeRouteIDs.SPACES_WELCOME;
    } else if (this._isSpaceRoute()) {
      return this._gmailRouteProcessor.NativeRouteIDs.SPACE;
    } else {
      return this._gmailRouteProcessor.getRouteID(this._name)!;
    }
  }

  // Used to click gmail refresh button in thread lists
  refresh() {
    var el =
      GmailElementGetter.getToolbarElement().querySelector<HTMLElement>(
        'div.T-I.nu',
      );

    if (el) {
      var prevActive = document.activeElement as HTMLElement;
      var prevClassName = el.className;
      simulateClick(el);
      el.className = prevClassName; // remove the gmail focus class

      if (prevActive) {
        prevActive.focus();
      } else {
        el.blur();
      }
    }
  }

  /** @deprecated */
  setFullWidth() {
    // The setFullWidth method does not do anything in Gmail
  }

  _extractParamKeysFromRouteID(routeID: string): string[] {
    return routeID
      .split('/')
      .filter((part) => part[0] === ':')
      .map((part) => part.substring(1));
  }

  _getThreadContainerElement() {
    return GmailElementGetter.getThreadContainerElement();
  }
}

export default GmailRouteView;
