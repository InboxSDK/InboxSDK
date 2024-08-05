import RouteView from './route-view';
import Kefir, { Observable } from 'kefir';
import kefirCast from 'kefir-cast';
import CollapsibleSectionView from '../collapsible-section-view';
import SectionView from '../section-view';
import type { RouteViewDriver } from '../../driver-interfaces/route-view-driver';
import type { Driver } from '../../driver-interfaces/driver';
import type { SectionDescriptor } from '../../../inboxsdk';
import type { Descriptor } from '../../../types/descriptor';

/**
 * Extends {@link RouteView}. {@link ListRouteView}s represent pages within Gmail that show a list of emails. Typical examples are the Inbox, Sent Mail, Drafts, etc. However, views like the Conversation view or Settings would not be a ListRouteView.
 */
class ListRouteView extends RouteView {
  #routeViewDriver;
  #driver;
  #appId;
  #sectionViews: { destroy(): void }[] = [];

  constructor(routeViewDriver: RouteViewDriver, driver: Driver, appId: string) {
    super(routeViewDriver);
    this.#routeViewDriver = routeViewDriver;
    this.#driver = driver;
    this.#appId = appId;

    this.#bindToEventStream();
  }

  /**
   * Adds a collapsible section to the top of the page.
   */
  addCollapsibleSection(
    collapsibleSectionDescriptor: Descriptor<
      SectionDescriptor | null | undefined
    >,
  ): CollapsibleSectionView {
    const collapsibleSectionViewDriver =
      this.#routeViewDriver.addCollapsibleSection(
        kefirCast(
          Kefir,
          collapsibleSectionDescriptor,
        ).toProperty() as Observable<
          SectionDescriptor | null | undefined,
          unknown
        >,
        this.#appId,
      );
    const collapsibleSectionView = new CollapsibleSectionView(
      collapsibleSectionViewDriver,
      this.#driver,
    );
    this.#sectionViews.push(collapsibleSectionView);
    return collapsibleSectionView;
  }

  /** Adds a non-collapsible section to the top of the page. */
  addSection(
    sectionDescriptor: Descriptor<SectionDescriptor | null | undefined>,
  ): SectionView {
    const sectionViewDriver = this.#routeViewDriver.addSection(
      kefirCast(Kefir, sectionDescriptor).toProperty() as Observable<
        SectionDescriptor | null | undefined,
        unknown
      >,
      this.#appId,
    );
    const sectionView = new SectionView(sectionViewDriver, this.#driver);
    this.#sectionViews.push(sectionView);
    return sectionView;
  }

  /**
   * Hides the search filter toolbar that appears on search pages.
   *
   * This method may not support other pages such as the Sent page, even though
   * it has a very similar filter toolbar.
   */
  hideSearchPageFilterToolbar() {
    this.#routeViewDriver.hideSearchPageFilterToolbar();
  }

  /** Simulates a click on the Gmail thread list refresh button. */
  refresh() {
    this.#routeViewDriver.refresh();
  }

  #bindToEventStream() {
    this.#routeViewDriver.getEventStream().onEnd(() => {
      this.#sectionViews.forEach((sectionView) => {
        sectionView.destroy();
      });
    });
  }
}

export default ListRouteView;
