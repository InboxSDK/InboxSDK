import udKefir from 'ud-kefir';
import * as Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import GmailAppSidebarPrimary from './primary';
import ContentPanelViewDriver, {
  type ContentPanelDescriptor,
} from '../../../../driver-common/sidebar/ContentPanelViewDriver';
import type GmailDriver from '../../gmail-driver';
import type GmailThreadView from '../gmail-thread-view';
const updates = udKefir(module, null);

/**
 * @internal
 */
class GmailAppSidebarView {
  #stopper = kefirStopper();
  #driver: GmailDriver;
  #instanceId: string;

  constructor(
    driver: GmailDriver,
    companionSidebarContentContainerElement: HTMLElement,
  ) {
    this.#driver = driver;
    /**
     * We need to be able to cooperate with other apps/extensions that are
     * sharing the app sidebar. We store some properties as attributes in the
     * shared DOM instead of as class properties; class properties are mostly
     * restricted to being used for references to DOM nodes. When
     * GmailAppSidebarView is instantiated, we check the element for an
     * attribute to see whether a previous extension's GmailAppSidebarView has
     * already set up the sidebar or not.
     */
    const instanceId = companionSidebarContentContainerElement.getAttribute(
      'data-sdk-sidebar-instance-id',
    );

    if (instanceId != null) {
      this.#instanceId = instanceId;
    } else {
      let primary = new GmailAppSidebarPrimary(
        driver,
        companionSidebarContentContainerElement,
      );
      this.#instanceId = primary.getInstanceId();
      // hot reloading support. Not perfect; this will break any existing panels.
      updates.changes().onValue(() => {
        primary.destroy();
        primary = new GmailAppSidebarPrimary(
          driver,
          companionSidebarContentContainerElement,
        );
        this.#instanceId = primary.getInstanceId();
      });
    }
  }

  destroy() {
    this.#stopper.destroy();
  }

  getStopper() {
    return this.#stopper;
  }

  addThreadSidebarContentPanel(
    descriptor: Kefir.Observable<ContentPanelDescriptor, unknown>,
    threadView: GmailThreadView,
  ) {
    const panel = new ContentPanelViewDriver(
      this.#driver,
      descriptor,
      this.#instanceId,
    );
    Kefir.merge([threadView.getStopper(), this.#stopper])
      .take(1)
      .takeUntilBy(panel.getStopper())
      .onValue(() => panel.remove());
    return panel;
  }

  addGlobalSidebarContentPanel(
    descriptor: Kefir.Observable<ContentPanelDescriptor, unknown>,
  ) {
    const panel = new ContentPanelViewDriver(
      this.#driver,
      descriptor,
      this.#instanceId,
      true,
    );

    this.#stopper.takeUntilBy(panel.getStopper()).onValue(() => panel.remove());

    return panel;
  }
}

export default GmailAppSidebarView;
