import EventEmitter from '../lib/safe-event-emitter';
import type { Driver } from '../driver-interfaces/driver';
import type GmailCollapsibleSectionView from '../dom-driver/gmail/views/gmail-collapsible-section-view';
import type { RowDescriptor } from '../../inboxsdk';

/**
* {@link CollapsibleSectionView}s allow you to display additional content on ListRouteViews. They are typically rendered as additional content above the list of threads below. The visual style is similar to that of multiple inbox sections used in native Gmail. Note that the rendering may vary slightly depending on the actual ListRouteView that the {@link CollapsibleSectionView} is rendered in. For example, {@link CollapsibleSectionViews} rendered on search results pages use different header styles to match Gmail's style more accurately.

 * You can either render rows (that are visually similar to Gmail rows) or custom content in your {@link CollapsibleSectionView}. Until content is provided, the SectionView will simply display a "Loading..." indicator.
 *
 * @see ListRouteView.addCollapsibleSection for more information.
 * @todo the docs mention this class extending SectionView. That doesn't seem to be the case.
*/
class CollapsibleSectionView extends EventEmitter {
  /** This property is set to true once the view is destroyed. */
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

  /** Removes this section from the current Route */
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
    .onValue(({ rowDescriptor }: { rowDescriptor: RowDescriptor }) => {
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
