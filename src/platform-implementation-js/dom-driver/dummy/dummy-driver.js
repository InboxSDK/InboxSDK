import addAccessors from '../../lib/add-accessors';
import assertInterface from '../../lib/assert-interface';
import Driver from '../../driver-interfaces/driver';

export default class DummyDriver {
  getLogger() {

  }

  openComposeWindow() {

  }

  createKeyboardShortcutHandle(a, b, c) {

  }

  getUserEmailAddress() {

  }

  addNavItem(a, b) {

  }

  getSentMailNativeNavItem() {

  }

  createLink(a, b) {

  }

  goto(a, b) {

  }

  addCustomRouteID(a) {

  }

  addCustomListRouteID(a, b) {

  }

  showCustomRouteView(a) {

  }

  getCurrentActiveNavItem() {

  }

  setNativeRouteIDs(a) {

  }

  setNativeListRouteIDs(a) {

  }

  setRouteTypes(a) {

  }

  registerSearchSuggestionsProvider(a) {

  }

  registerSearchQueryRewriter(a) {

  }

  addToolbarButtonForApp(a) {

  }

  createModalViewDriver(a) {

  }
}

addAccessors(DummyDriver.prototype, [
  {name: '_routeViewDriverStream', get: true},
  {name: '_rowListViewDriverStream', get: true},
  {name: '_composeViewDriverStream', get: true},
  {name: '_threadViewDriverStream', get: true},
  {name: '_messageViewDriverStream', get: true},
  {name: '_threadRowViewDriverKefirStream', get: true},
  {name: '_toolbarViewDriverStream', get: true},
  {name: '_butterBarDriver', get: true}
]);

assertInterface(DummyDriver.prototype, Driver);
