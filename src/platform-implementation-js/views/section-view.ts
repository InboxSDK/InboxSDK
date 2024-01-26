import EventEmitter from '../lib/safe-event-emitter';
import type { Driver } from '../driver-interfaces/driver';
import type GmailCollapsibleSectionView from '../dom-driver/gmail/views/gmail-collapsible-section-view';

/**
 * {@link SectionView}s allow you to display additional content on ListRouteViews. They are typically rendered as additional content above the list of threads below. The visual style is similar to that of multiple inbox sections used in native Gmail. Note that the rendering may vary slightly depending on the actual ListRouteView that the SectionView is rendered in. For example, SectionViews rendered on search results pages use different header styles to match Gmail's style more accurately.

 * You can either render rows (that are visually similar to Gmail rows) or custom content in your SectionView. Until content is provided, the SectionView will simply display a "Loading..." indicator. See ListRouteView.addSection for more information.
 */
class SectionView extends EventEmitter {
  destroyed: boolean;
  #sectionViewDriver;

  constructor(sectionViewDriver: GmailCollapsibleSectionView, driver: Driver) {
    super();
    this.#sectionViewDriver = sectionViewDriver;
    this.destroyed = false;

    _bindToEventStream(this, sectionViewDriver, driver);
  }

  /**
   * Removes this section from the current Route.
   */
  remove() {
    this.destroy();
  }

  destroy() {
    this.#sectionViewDriver.destroy();
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
