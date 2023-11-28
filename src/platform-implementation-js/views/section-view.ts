import EventEmitter from '../lib/safe-event-emitter';
import get from '../../common/get-or-fail';
import type { Driver } from '../driver-interfaces/driver';
import type GmailCollapsibleSectionView from '../dom-driver/gmail/views/gmail-collapsible-section-view';
const membersMap = new WeakMap();

class SectionView extends EventEmitter {
  destroyed: boolean;

  constructor(sectionViewDriver: GmailCollapsibleSectionView, driver: Driver) {
    super();
    const members = {
      sectionViewDriver,
    };
    membersMap.set(this, members);
    this.destroyed = false;

    _bindToEventStream(this, sectionViewDriver, driver);
  }

  remove() {
    this.destroy();
  }

  destroy() {
    const members = get(membersMap, this);
    members.sectionViewDriver.destroy();
    this.removeAllListeners();
  }
}

function _bindToEventStream(
  sectionView: SectionView,
  sectionViewDriver: GmailCollapsibleSectionView,
  driver: Driver,
) {
  sectionViewDriver.getEventStream().onValue((e) => {
    sectionView.emit(e.eventName);
  });
  sectionViewDriver
    .getEventStream()
    .filter(
      ({ eventName }: { eventName: unknown }) => eventName === 'rowClicked',
    )
    .onValue(
      ({
        rowDescriptor,
      }: {
        rowDescriptor: { routeID?: string; routeParams: any; onClick: unknown };
      }) => {
        if (rowDescriptor.routeID) {
          driver.goto(rowDescriptor.routeID, rowDescriptor.routeParams);
        }

        if (typeof rowDescriptor.onClick === 'function') {
          rowDescriptor.onClick();
        }
      },
    );
  sectionViewDriver
    .getEventStream()
    .filter(({ eventName }) => eventName === 'summaryClicked')
    .onValue(({ sectionDescriptor }) => {
      if (sectionDescriptor.onTitleLinkClick) {
        sectionDescriptor.onTitleLinkClick(sectionView);
      }
    });
  sectionViewDriver
    .getEventStream()
    .filter(({ eventName }) => eventName === 'footerClicked')
    .onValue(({ sectionDescriptor }) => {
      if (sectionDescriptor.onFooterLinkClick) {
        sectionDescriptor.onFooterLinkClick(sectionView);
      }
    });
  sectionViewDriver.getEventStream().onEnd(() => {
    sectionView.destroyed = true;
    sectionView.emit('destroy');
  });
}

export default SectionView;
