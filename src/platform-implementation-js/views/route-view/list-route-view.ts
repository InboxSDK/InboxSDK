import RouteView from './route-view';
import Kefir from 'kefir';
import kefirCast from 'kefir-cast';
import CollapsibleSectionView from '../collapsible-section-view';
import SectionView from '../section-view';
import type { RouteViewDriver } from '../../driver-interfaces/route-view-driver';
import type { Driver } from '../../driver-interfaces/driver';

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

  addCollapsibleSection(
    collapsibleSectionDescriptor: Record<string, any> | null | undefined,
  ): CollapsibleSectionView {
    const collapsibleSectionViewDriver =
      this.#routeViewDriver.addCollapsibleSection(
        kefirCast(Kefir, collapsibleSectionDescriptor).toProperty(),
        this.#appId,
      );
    const collapsibleSectionView = new CollapsibleSectionView(
      collapsibleSectionViewDriver,
      this.#driver,
    );
    this.#sectionViews.push(collapsibleSectionView);
    return collapsibleSectionView;
  }

  addSection(
    sectionDescriptor: Record<string, any> | null | undefined,
  ): SectionView {
    const sectionViewDriver = this.#routeViewDriver.addSection(
      kefirCast(Kefir, sectionDescriptor).toProperty(),
      this.#appId,
    );
    const sectionView = new SectionView(sectionViewDriver, this.#driver);
    this.#sectionViews.push(sectionView);
    return sectionView;
  }

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
