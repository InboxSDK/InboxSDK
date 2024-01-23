import EventEmitter from '../lib/safe-event-emitter';
import type { Driver } from '../driver-interfaces/driver';
import type GmailCollapsibleSectionView from '../dom-driver/gmail/views/gmail-collapsible-section-view';

class CollapsibleSectionView extends EventEmitter {
  destroyed: boolean;
  #collapsibleSectionViewDriver: GmailCollapsibleSectionView;

  constructor(
    collapsibleSectionViewDriver: GmailCollapsibleSectionView,
    driver: Driver,
  ) {
    super();
    this.#collapsibleSectionViewDriver = collapsibleSectionViewDriver;
    this.destroyed = false;

    _bindToEventStream(this, collapsibleSectionViewDriver, driver);
  }

  setCollapsed(value: boolean) {
    this.#collapsibleSectionViewDriver.setCollapsed(value);
  }

  remove() {
    this.destroy();
  }

  destroy() {
    this.#collapsibleSectionViewDriver.destroy();
    this.removeAllListeners();
  }
}

function _bindToEventStream(
  collapsibleSectionView: CollapsibleSectionView,
  collapsibleSectionViewDriver: GmailCollapsibleSectionView,
  driver: Driver,
) {
  collapsibleSectionViewDriver.getEventStream().onValue(({ eventName }) => {
    collapsibleSectionView.emit(eventName);
  });
  collapsibleSectionViewDriver
    .getEventStream()
    .filter(({ eventName }) => eventName === 'rowClicked')
    .onValue(({ rowDescriptor }) => {
      if (rowDescriptor.routeID) {
        driver.goto(rowDescriptor.routeID, rowDescriptor.routeParams);
      }

      if (typeof rowDescriptor.onClick === 'function') {
        rowDescriptor.onClick();
      }
    });
  collapsibleSectionViewDriver
    .getEventStream()
    .filter(({ eventName }) => eventName === 'titleLinkClicked')
    .onValue(({ sectionDescriptor }) => {
      if (sectionDescriptor.onTitleLinkClick) {
        sectionDescriptor.onTitleLinkClick(collapsibleSectionView);
      }
    });
  collapsibleSectionViewDriver
    .getEventStream()
    .filter(({ eventName }) => eventName === 'footerClicked')
    .onValue(({ sectionDescriptor }) => {
      if (sectionDescriptor.onFooterLinkClick) {
        sectionDescriptor.onFooterLinkClick(collapsibleSectionView);
      }
    });
  collapsibleSectionViewDriver.getEventStream().onEnd(() => {
    collapsibleSectionView.destroyed = true;
    collapsibleSectionView.emit('destroy');
  });
}

export default CollapsibleSectionView;
