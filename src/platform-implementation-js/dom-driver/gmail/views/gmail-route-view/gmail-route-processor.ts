import includes from 'lodash/includes';
// only used for constants
import {
  NATIVE_ROUTE_IDS,
  NATIVE_LIST_ROUTE_IDS,
  ROUTE_TYPES,
} from '../../../../constants/router';

export default class GmailRouteProcessor {
  _routeNameToRouteIDMap: Record<string, string> = null!;
  _routeNameToRouteIDMaps: Record<string, string> = null!;
  _compatibleRouteIDMap: Record<string, string> = null!;

  constructor() {
    this._setupRouteNameToRouteIDMap();

    this._setupCompatibleRouteIDMap();
  }

  NativeRouteIDs = NATIVE_ROUTE_IDS;
  NativeListRouteIDs = NATIVE_LIST_ROUTE_IDS;
  RouteTypes = ROUTE_TYPES;
  isListRouteName(routeName: string) {
    var routeID = this.getRouteID(routeName);

    if (!routeID) {
      return false;
    }

    return includes(Object.values(NATIVE_LIST_ROUTE_IDS), routeID);
  }
  isSettingsRouteName(routeName: string) {
    return (
      this._routeNameToRouteIDMap[routeName] === this.NativeRouteIDs.SETTINGS
    );
  }
  isContactRouteName(routeName: string) {
    return (
      this._routeNameToRouteIDMap[routeName] === this.NativeRouteIDs.CONTACTS ||
      this._routeNameToRouteIDMap[routeName] === this.NativeRouteIDs.CONTACT
    );
  }
  getRouteID(routeName: string) {
    var routeID = this._routeNameToRouteIDMap[routeName];
    return routeID ? routeID : null;
  }
  getRouteName(routeID: string) {
    for (var key in this._routeNameToRouteIDMaps) {
      if (this._routeNameToRouteIDMap[key] === routeID) {
        return key;
      }
    }

    return null;
  }
  isNativeRoute(routeName: string) {
    return !!this._routeNameToRouteIDMap[routeName];
  }
  getCompatibleRouteID(routeID: string) {
    return this._compatibleRouteIDMap[routeID] || routeID;
  }
  _setupRouteNameToRouteIDMap() {
    this._routeNameToRouteIDMap = {
      inbox: this.NativeRouteIDs.INBOX,
      section_query: this.NativeRouteIDs.SEARCH,
      all: this.NativeRouteIDs.ALL_MAIL,
      imp: this.NativeRouteIDs.IMPORTANT,
      contacts: this.NativeRouteIDs.CONTACTS,
      contact: this.NativeRouteIDs.CONTACT,
      sent: this.NativeRouteIDs.SENT,
      starred: this.NativeRouteIDs.STARRED,
      snoozed: this.NativeRouteIDs.SNOOZED,
      drafts: this.NativeRouteIDs.DRAFTS,
      label: this.NativeRouteIDs.LABEL,
      category: this.NativeRouteIDs.LABEL,
      search: this.NativeRouteIDs.SEARCH,
      'advanced-search': this.NativeRouteIDs.SEARCH,
      trash: this.NativeRouteIDs.TRASH,
      spam: this.NativeRouteIDs.SPAM,
      apps: this.NativeRouteIDs.SEARCH,
      circle: this.NativeRouteIDs.LABEL,
      settings: this.NativeRouteIDs.SETTINGS,
      chats: this.NativeRouteIDs.CHATS,
      // new Gmail stuff
      scheduled: this.NativeRouteIDs.SCHEDULED,
      // these are added as part of new gmail redesign -- FEB 2023
      chat: this.NativeRouteIDs.CHAT_WELCOME,
      rooms: this.NativeRouteIDs.SPACES_WELCOME,
      calls: this.NativeRouteIDs.MEET,
    };
  }
  _setupCompatibleRouteIDMap() {
    this._compatibleRouteIDMap = {};
    this._compatibleRouteIDMap[this.NativeRouteIDs.INBOX] = 'inbox/p:page';
    this._compatibleRouteIDMap[this.NativeRouteIDs.ALL_MAIL] = 'all/p:page';
    this._compatibleRouteIDMap[this.NativeRouteIDs.SENT] = 'sent/p:page';
    this._compatibleRouteIDMap[this.NativeRouteIDs.STARRED] = 'starred/p:page';
    this._compatibleRouteIDMap[this.NativeRouteIDs.DRAFTS] = 'drafts/p:page';
    this._compatibleRouteIDMap[this.NativeRouteIDs.LABEL] =
      'label/:labelName/p:page';
    this._compatibleRouteIDMap[this.NativeRouteIDs.TRASH] = 'trash/p:page';
    this._compatibleRouteIDMap[this.NativeRouteIDs.SPAM] = 'spam/p:page';
    this._compatibleRouteIDMap[this.NativeRouteIDs.IMPORTANT] = 'imp/p:page';
    this._compatibleRouteIDMap[this.NativeRouteIDs.SEARCH] =
      'search/:query/p:page';
    this._compatibleRouteIDMap[this.NativeRouteIDs.THREAD] =
      this.NativeRouteIDs.THREAD;
    this._compatibleRouteIDMap[this.NativeRouteIDs.CHATS] = 'chats/p:page';
    this._compatibleRouteIDMap[this.NativeRouteIDs.CHAT] =
      this.NativeRouteIDs.CHAT;
    this._compatibleRouteIDMap[this.NativeRouteIDs.CONTACTS] =
      'contacts/p:page';
    this._compatibleRouteIDMap[this.NativeRouteIDs.CONTACT] =
      this.NativeRouteIDs.CONTACT;
    this._compatibleRouteIDMap[this.NativeRouteIDs.SETTINGS] =
      this.NativeRouteIDs.SETTINGS;
  }
}
