import SafeEventEmitter from './lib/safe-event-emitter';
// import Membrane from './lib/Membrane';

// import AttachmentCardView from './views/conversations/attachment-card-view';
type AttachmentCardView = any;
// import GmailAttachmentCardView from './dom-driver/gmail/views/gmail-attachment-card-view';
type GmailAttachmentCardView = any;
// import InboxAttachmentCardView from './dom-driver/inbox/views/inbox-attachment-card-view';
type InboxAttachmentCardView = any;

// import MessageView from './views/conversations/message-view';
type MessageView = any;
// import GmailMessageView from './dom-driver/gmail/views/gmail-message-view';
type GmailMessageView = any;
// import InboxMessageView from './dom-driver/inbox/views/inbox-message-view';
type InboxMessageView = any;

// import ThreadView from './views/conversations/thread-view';
type ThreadView = any;
// import GmailThreadView from './dom-driver/gmail/views/gmail-thread-view';
type GmailThreadView = any;
// import InboxThreadView from './dom-driver/inbox/views/inbox-thread-view';
type InboxThreadView = any;

// import ThreadRowView from './views/thread-row-view';
type ThreadRowView = any;
// import GmailThreadRowView from './dom-driver/gmail/views/gmail-thread-row-view';
type GmailThreadRowView = any;
// import InboxThreadRowView from './dom-driver/inbox/views/inbox-thread-row-view';
type InboxThreadRowView = any;

// import ComposeView from './views/compose-view';
// import GmailComposeView from './dom-driver/gmail/views/gmail-compose-view';
// import InboxComposeView from './dom-driver/inbox/views/inbox-compose-view';
type InboxComposeView = any;

// import DummyRouteViewDriver from './views/route-view/dummy-route-view-driver';
type DummyRouteViewDriver = any;
// import RouteView from './views/route-view/route-view';
type RouteView = any;
// import GmailRouteView from './dom-driver/gmail/views/gmail-route-view/gmail-route-view';
type GmailRouteView = any;
// import InboxRouteView from './dom-driver/inbox/views/inbox-route-view';
type InboxRouteView = any;
// import InboxDummyRouteView from './dom-driver/inbox/views/inbox-dummy-route-view';
type InboxDummyRouteView = any;
// import InboxCustomRouteView from './dom-driver/inbox/views/inbox-custom-route-view';
type InboxCustomRouteView = any;

import ButterBar from './namespaces/butter-bar';
// import Compose from './namespaces/compose';
type Compose = any;
// import Conversations from './namespaces/conversations';
type Conversations = any;
// import Keyboard from './namespaces/keyboard';
type Keyboard = any;
// import Widgets from './namespaces/widgets';
type Widgets = any;
// import Modal from './namespaces/modal';
type Modal = any;
// import Lists from './namespaces/lists';
type Lists = any;
// import NavMenu from './namespaces/nav-menu';
type NavMenu = any;
import AppMenu from './namespaces/app-menu';
// import Router from './namespaces/router';
type Router = any;
// import Search from './namespaces/search';
type Search = any;
// import Toolbars from './namespaces/toolbars';
type Toolbars = any;
// import User from './namespaces/user';
type User = any;
// import Global from './namespaces/global';
type Global = any;

// Some types
import { Driver } from './driver-interfaces/driver';
import { AppLogger } from './lib/logger';

export interface PiOpts {
  appName?: string;
  appIconUrl?: string;
  suppressAddonTitle?: string;
  VERSION: string;
  globalErrorLogging: boolean;
  eventTracking: boolean;
  inboxBeta: boolean;
  REQUESTED_API_VERSION: number;
  primaryColor?: string;
  secondaryColor?: string;
}

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
  Global: Global | undefined;
  Modal: Modal | undefined;
  Logger: AppLogger;

  constructor(driver: Driver, appId: string, piOpts: PiOpts);
  destroy(): void;
}

export interface EnvData {
  piMainStarted: number;
  piLoadStarted: number;
  wasAccountSwitcherReadyAtStart: boolean;
}

// returns a promise for the PlatformImplementation object
export function makePlatformImplementation(
  appId: string,
  _opts: object,
  envData: EnvData
): Promise<PlatformImplementation>;
