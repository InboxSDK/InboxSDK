import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import delayAsap from '../../lib/delay-asap';
import type { Driver } from '../../driver-interfaces/driver';
import querySelector from '../../lib/dom/querySelectorOrFail';
import { sidebarWaitingPlatformSelector } from './constants';

export interface ContentPanelDescriptor {
  appIconUrl?: string;
  appName?: string;
  el: HTMLElement;
  id?: string;
  hideTitleBar?: boolean;
  iconClass?: string;
  iconLiga?: string;
  iconUrl?: string;
  orderHint?: number;
  primaryColor?: string;
  secondaryColor?: string;
  title?: string;
}

export interface SidebarPanelEvent {
  appIconUrl?: string;
  appId: string;
  appName: string;
  hideTitleBar: boolean;
  iconLiga?: string;
  iconClass?: string;
  iconUrl?: string;
  id: string;
  instanceId: string;
  isGlobal?: boolean;
  orderHint: number;
  primaryColor?: string;
  secondaryColor?: string;
  sidebarId: string;
  title?: string;
}

class ContentPanelViewDriver {
  #driver: Driver;
  #stopper: Kefir.Observable<null, unknown>;
  #eventStream = kefirBus<{ eventName: 'activate' | 'deactivate' }, unknown>();
  #isActive: boolean = false;
  /**
   * This is not the `id` property passed by the application, but a random
   * unique identifier used to manage a specific instance.
   * */
  #instanceId: string = `${Date.now()}-${Math.random()}`;
  #sidebarId: string;
  #isGlobal: boolean;

  constructor(
    driver: Driver,
    descriptor: Kefir.Observable<ContentPanelDescriptor, unknown>,
    sidebarId: string,
    isGlobal?: boolean,
  ) {
    this.#driver = driver;
    this.#sidebarId = sidebarId;
    this.#isGlobal = Boolean(isGlobal);
    this.#stopper = this.#eventStream
      .ignoreValues()
      .beforeEnd(() => null)
      .toProperty();

    this.#eventStream.plug(
      Kefir.fromEvents(document.body, 'inboxsdkSidebarPanelActivated')
        .filter((e: any) => e.detail.instanceId === this.#instanceId)
        .map(() => {
          this.#isActive = true;
          return {
            eventName: 'activate',
          };
        }),
    );

    this.#eventStream.plug(
      Kefir.fromEvents(document.body, 'inboxsdkSidebarPanelDeactivated')
        .filter((e: any) => e.detail.instanceId === this.#instanceId)
        .map(() => {
          this.#isActive = false;
          return {
            eventName: 'deactivate',
          };
        }),
    );

    // Attach a value-listener so that it immediately subscribes and the
    // property retains its value.
    const afterAsap = delayAsap()
      .toProperty()

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .onValue(() => {});
    let hasPlacedAlready = false;
    let appName: any;
    const waitingPlatform = querySelector(
      document.body,
      sidebarWaitingPlatformSelector,
    );
    descriptor
      .flatMap((x) => afterAsap.map(() => x))
      .takeUntilBy(this.#stopper)
      .onValue((descriptor) => {
        const {
          el,
          iconUrl,
          iconLiga,
          iconClass,
          title,
          orderHint,
          id,
          hideTitleBar,
          appIconUrl,
          primaryColor,
          secondaryColor,
        } = descriptor;
        appName =
          descriptor.appName || driver.getOpts().appName || descriptor.title;

        if (!document.body.contains(el)) {
          waitingPlatform.appendChild(el);
        }

        const eventName = hasPlacedAlready
          ? 'inboxsdkUpdateSidebarPanel'
          : 'inboxsdkNewSidebarPanel';
        hasPlacedAlready = true;
        el.dispatchEvent(
          new CustomEvent<SidebarPanelEvent>(eventName, {
            bubbles: true,
            cancelable: false,
            detail: {
              appIconUrl:
                appIconUrl || this.#driver.getOpts().appIconUrl || iconUrl,
              appId: this.#driver.getAppId(),
              appName,
              hideTitleBar: Boolean(hideTitleBar),
              iconClass,
              iconLiga,
              iconUrl,
              id: String(id || title),
              instanceId: this.#instanceId,
              isGlobal,
              orderHint: typeof orderHint === 'number' ? orderHint : 0,
              primaryColor: primaryColor || this.#driver.getOpts().primaryColor,
              secondaryColor:
                secondaryColor || this.#driver.getOpts().secondaryColor,
              sidebarId: this.#sidebarId,
              title,
            },
          }),
        );
      });

    this.#stopper.onValue(() => {
      if (!hasPlacedAlready) return;
      document.body.dispatchEvent(
        new CustomEvent('inboxsdkRemoveSidebarPanel', {
          bubbles: true,
          cancelable: false,
          detail: {
            appName,
            sidebarId: this.#sidebarId,
            instanceId: this.#instanceId,
            isGlobal,
          },
        }),
      );
    });
  }

  getStopper() {
    return this.#stopper;
  }

  getEventStream() {
    return this.#eventStream;
  }

  // TODO: is this used?
  scrollIntoView() {
    document.body.dispatchEvent(
      new CustomEvent('inboxsdkSidebarPanelScrollIntoView', {
        bubbles: true,
        cancelable: false,
        detail: {
          instanceId: this.#instanceId,
          sidebarId: this.#sidebarId,
        },
      }),
    );
  }

  close() {
    document.body.dispatchEvent(
      new CustomEvent('inboxsdkSidebarPanelClose', {
        bubbles: true,
        cancelable: false,
        detail: {
          instanceId: this.#instanceId,
          isGlobal: this.#isGlobal,
          sidebarId: this.#sidebarId,
        },
      }),
    );
  }

  open() {
    document.body.dispatchEvent(
      new CustomEvent('inboxsdkSidebarPanelOpen', {
        bubbles: true,
        cancelable: false,
        detail: {
          instanceId: this.#instanceId,
          isGlobal: this.#isGlobal,
          sidebarId: this.#sidebarId,
        },
      }),
    );
  }

  isActive(): boolean {
    return this.#isActive;
  }

  remove() {
    this.#eventStream.end();
  }
}

export default ContentPanelViewDriver;
