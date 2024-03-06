import EventEmitter from '../lib/safe-event-emitter';
import type { Driver } from '../driver-interfaces/driver';
import type GmailCollapsibleSectionView from '../dom-driver/gmail/views/gmail-collapsible-section-view';
import TypedEventEmitter from 'typed-emitter';

export type ViewEvent = {
  collapsed(): void;
  destroy(): void;
  expanded(): void;
  footerClicked(): void;
  rowClicked(): void;
  titleLinkClicked(): void;
};

/**
* {@link CollapsibleSectionView}s allow you to display additional content on ListRouteViews. They are typically rendered as additional content above the list of threads below. The visual style is similar to that of multiple inbox sections used in native Gmail. Note that the rendering may vary slightly depending on the actual ListRouteView that the {@link CollapsibleSectionView} is rendered in. For example, {@link CollapsibleSectionViews} rendered on search results pages use different header styles to match Gmail's style more accurately.

 * You can either render rows (that are visually similar to Gmail rows) or custom content in your {@link CollapsibleSectionView}. Until content is provided, the SectionView will simply display a "Loading..." indicator.
 *
 * @see ListRouteView.addCollapsibleSection for more information.
 * @todo the docs mention this class extending SectionView. That doesn't seem to be the case.
*/
class CollapsibleSectionView extends (EventEmitter as new () => TypedEventEmitter<ViewEvent>) {
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
  collapsibleSectionViewDriver.eventStream.onValue((event) => {
    if (!('eventName' in event)) {
      return;
    }

    const { eventName } = event;
    collapsibleSectionView.emit(eventName);
  });
  collapsibleSectionViewDriver.eventStream.onValue((event) => {
    if (!('eventName' in event) || event.eventName !== 'rowClicked') {
      return;
    }

    const { rowDescriptor } = event;

    if (rowDescriptor.routeID) {
      driver.goto(rowDescriptor.routeID, rowDescriptor.routeParams);
    }

    if (typeof rowDescriptor.onClick === 'function') {
      rowDescriptor.onClick();
    }
  });
  collapsibleSectionViewDriver.eventStream.onValue((event) => {
    if (!('eventName' in event) || event.eventName !== 'titleLinkClicked') {
      return;
    }

    const { sectionDescriptor } = event;

    if (sectionDescriptor.onTitleLinkClick) {
      sectionDescriptor.onTitleLinkClick(collapsibleSectionView);
    }
  });
  collapsibleSectionViewDriver.eventStream.onValue((event) => {
    if (!('eventName' in event) || event.eventName !== 'footerClicked') {
      return;
    }

    const { sectionDescriptor } = event;

    if (sectionDescriptor.onFooterLinkClick) {
      sectionDescriptor.onFooterLinkClick(collapsibleSectionView);
    }
  });
  collapsibleSectionViewDriver.eventStream.onEnd(() => {
    collapsibleSectionView.destroyed = true;
    collapsibleSectionView.emit('destroy');
  });
}

export default CollapsibleSectionView;
