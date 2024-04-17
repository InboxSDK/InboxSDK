import SafeEventEmitter from './lib/safe-event-emitter';
import { BUILD_VERSION } from '../common/version';
import Membrane from './lib/Membrane';
import AttachmentCardView from './views/conversations/attachment-card-view';
import GmailAttachmentCardView from './dom-driver/gmail/views/gmail-attachment-card-view';
import MessageView from './views/conversations/message-view';
import GmailMessageView from './dom-driver/gmail/views/gmail-message-view';
import ThreadView from './views/conversations/thread-view';
import GmailThreadView from './dom-driver/gmail/views/gmail-thread-view';
import ThreadRowView from './views/thread-row-view';
import GmailThreadRowView from './dom-driver/gmail/views/gmail-thread-row-view';
import ComposeView from './views/compose-view';
import GmailComposeView from './dom-driver/gmail/views/gmail-compose-view';
import DummyRouteViewDriver from './views/route-view/dummy-route-view-driver';
import RouteView from './views/route-view/route-view';
import GmailRouteView from './dom-driver/gmail/views/gmail-route-view/gmail-route-view';
import ButterBar from './namespaces/butter-bar';
import Compose from './namespaces/compose';
import Conversations from './namespaces/conversations';
import Keyboard from './namespaces/keyboard';
import Widgets from './namespaces/widgets';
import Modal from './namespaces/modal';
import Lists from './namespaces/lists';
import NavMenu from './namespaces/nav-menu';
import AppMenu from './namespaces/app-menu';
import Router from './namespaces/router';
import Search from './namespaces/search';
import Toolbars from './namespaces/toolbars';
import User from './namespaces/user';
import Global from './namespaces/global';
import GmailDriver from './dom-driver/gmail/gmail-driver';
import Logger from './lib/logger';
import isValidAppId from './lib/is-valid-app-id';
// Some types
import type { AppLogger } from './lib/logger';
const loadedAppIds: Set<string> = new Set();
export type PiOpts = {
  appName: string | null | undefined;
  appIconUrl: string | null | undefined;
  suppressAddonTitle?: string | null | undefined;
  VERSION: string;
  globalErrorLogging: boolean;
  eventTracking: boolean;
  REQUESTED_API_VERSION: number;
  primaryColor?: string;
  secondaryColor?: string;
};
export class PlatformImplementation extends SafeEventEmitter {
  destroyed: boolean;
  LOADER_VERSION: string;
  IMPL_VERSION: string;
  Compose: Compose;
  Conversations: Conversations;
  Keyboard: Keyboard;
  User: User;
  Lists: Lists;
  NavMenu: NavMenu;
  AppMenu: AppMenu;
  Router: Router;
  Search: Search;
  Toolbars: Toolbars;
  ButterBar: ButterBar;
  Widgets: Widgets;
  Global!: Global;
  /**
   * @deprecated
   */
  Modal: Modal | null | undefined;
  Logger: AppLogger;

  #driver: GmailDriver;
  /**
   * @internal only available in dev builds
   */
  private _members?: { driver: GmailDriver };

  constructor(driver: GmailDriver, appId: string, piOpts: PiOpts) {
    super();
    const { appName, appIconUrl, VERSION: LOADER_VERSION } = piOpts;
    this.#driver = driver;

    if (process.env.NODE_ENV !== 'production') {
      this._members = { driver };
    }

    const membrane: Membrane = new Membrane([
      [
        GmailComposeView,
        (viewDriver) => new ComposeView(driver, viewDriver, membrane),
      ],
      [
        GmailAttachmentCardView,
        (viewDriver) => new AttachmentCardView(viewDriver, driver, membrane),
      ],
      [
        GmailMessageView,
        (viewDriver) => new MessageView(viewDriver, membrane, driver),
      ],
      [
        GmailThreadView,
        (viewDriver) => new ThreadView(viewDriver, appId, driver, membrane),
      ],
      [GmailThreadRowView, (viewDriver) => new ThreadRowView(viewDriver)],
      [GmailRouteView, (viewDriver) => new RouteView(viewDriver)],
      [DummyRouteViewDriver, (viewDriver) => new RouteView(viewDriver)],
    ]);
    this.destroyed = false;
    this.LOADER_VERSION = LOADER_VERSION;
    this.IMPL_VERSION = BUILD_VERSION;
    this.ButterBar = new ButterBar(appId, driver);
    driver.setButterBar(this.ButterBar);
    this.Compose = new Compose(driver, membrane);
    this.Conversations = new Conversations(appId, driver, membrane);
    this.Keyboard = new Keyboard(appId, appName, appIconUrl, driver);
    this.User = new User(driver, piOpts);
    this.Lists = new Lists(appId, driver, membrane);
    this.NavMenu = new NavMenu(appId, driver);
    this.AppMenu = new AppMenu(driver);
    this.Router = new Router(appId, driver, membrane);
    this.Search = new Search(appId, driver);
    this.Toolbars = new Toolbars(appId, driver, membrane, piOpts);
    this.Widgets = new Widgets(appId, driver);

    if (piOpts.REQUESTED_API_VERSION === 1) {
      // Modal is deprecated; just drop it when apps switch to the next version
      // whenever we start that.
      this.Modal = new Modal(appId, driver, piOpts);
    }

    if (piOpts.REQUESTED_API_VERSION >= 2) {
      // new Global namespace only available in v2 or above
      this.Global = new Global(appId, driver);
    }

    this.Logger = driver.getLogger().getAppLogger();
  }

  destroy() {
    if (!this.destroyed) {
      this.destroyed = true;
      this.#driver.destroy();
      this.emit('destroy');
    }
  }
}
export type EnvData = {
  piMainStarted: number;
  piLoadStarted: number;
  wasAccountSwitcherReadyAtStart: boolean;
};
// returns a promise for the PlatformImplementation object
export function makePlatformImplementation(
  appId: string,
  _opts: Partial<PiOpts>,
  envData: EnvData,
): Promise<PlatformImplementation> {
  if (typeof appId !== 'string') {
    throw new Error('appId must be a string');
  }

  const opts: PiOpts = {
    // defaults
    globalErrorLogging: true,
    eventTracking: true,
    ..._opts,
  } as PiOpts;
  opts.REQUESTED_API_VERSION = +opts.REQUESTED_API_VERSION;

  switch (opts.REQUESTED_API_VERSION) {
    case 2:
    case 1:
      break;

    default:
      throw new Error(
        'InboxSDK: Unsupported API version ' + opts.REQUESTED_API_VERSION,
      );
  }

  const LOADER_VERSION: string = opts.VERSION;
  const IMPL_VERSION: string = BUILD_VERSION;
  const logger = new Logger(appId, opts, LOADER_VERSION, IMPL_VERSION);
  const origin: string =
    (process.env.NODE_ENV === 'test' && global.__test_origin) ||
    document.location.origin;

  if (origin !== 'https://mail.google.com') {
    /* eslint-disable-next-line @typescript-eslint/no-empty-function -- never resolve */
    return new Promise(() => {});
  }

  const driver = new GmailDriver(
    appId,
    LOADER_VERSION,
    IMPL_VERSION,
    logger,
    opts,
    envData,
  );
  return driver.onready.then(() => {
    if (!isValidAppId(appId)) {
      console.error(`
===========================================================
InboxSDK: You have loaded InboxSDK with an invalid appId:
${appId}
Registering an appId is free. Please see
https://www.inboxsdk.com/docs/#RequiredSetup
===========================================================
`);
      driver.showAppIdWarning();
    }

    if (driver.isRunningInPageContext()) {
      console.warn(
        'Running the InboxSDK outside of an extension content script is not recommended!',
      );
    }

    logger.eventSdkPassive('instantiate');
    const pi = new PlatformImplementation(driver, appId, opts);

    if (!loadedAppIds.has(appId)) {
      loadedAppIds.add(appId);
      logger.eventSdkPassive('load');
    }

    return pi;
  });
}
