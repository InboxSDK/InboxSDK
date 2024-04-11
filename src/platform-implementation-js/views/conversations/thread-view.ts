import EventEmitter from '../../lib/safe-event-emitter';
import type Membrane from '../../lib/Membrane';
import type SimpleElementView from '../../views/SimpleElementView';
import kefirCast from 'kefir-cast';
import Kefir, { type Observable } from 'kefir';
import ContentPanelView from '../content-panel-view';
import type MessageView from './message-view';
import type { Driver, ThreadViewDriver } from '../../driver-interfaces/driver';
import type CustomMessageView from '../../views/conversations/custom-message-view';
import type { Contact } from '../../../inboxsdk';
import type TypedEventEmitter from 'typed-emitter';
import { type ContentPanelDescriptor } from '../../driver-common/sidebar/ContentPanelViewDriver';
import type { Descriptor } from '../../../types/descriptor';

export type ThreadViewEvents = {
  destroy(): void;
  contactHover(data: {
    messageView: MessageView;
    contact: Contact;
    threadView: ThreadView;
  }): void;
};

class ThreadView extends (EventEmitter as new () => TypedEventEmitter<ThreadViewEvents>) {
  #threadViewImplementation: ThreadViewDriver;
  #appId: string;
  #driver: Driver;
  #membrane: Membrane;
  destroyed = false;

  constructor(
    threadViewImplementation: ThreadViewDriver,
    appId: string,
    driver: Driver,
    membrane: Membrane,
  ) {
    super();
    this.#threadViewImplementation = threadViewImplementation;
    this.#appId = appId;
    this.#driver = driver;
    this.#membrane = membrane;

    this.#bindToStreamEvents();
  }

  addSidebarContentPanel(
    descriptor: Descriptor<ContentPanelDescriptor>,
  ): ContentPanelView {
    const descriptorPropertyStream: Observable<
      ContentPanelDescriptor,
      unknown
    > = kefirCast(Kefir, descriptor).toProperty();
    this.#driver
      .getLogger()
      .eventSdkPassive('threadView.addSidebarContentPanel');
    const contentPanelImplementation =
      this.#threadViewImplementation.addSidebarContentPanel(
        descriptorPropertyStream,
      );

    if (contentPanelImplementation) {
      return new ContentPanelView(contentPanelImplementation);
    }

    return null!;
  }

  addNoticeBar(): SimpleElementView {
    return this.#threadViewImplementation.addNoticeBar();
  }

  /**
   * @alpha
   * @internal
   */
  registerHiddenCustomMessageNoticeProvider(
    provider: (
      numberCustomMessagesHidden: number,
      numberNativeMessagesHidden: number | null | undefined,
      unmountPromise: Promise<void>,
    ) => HTMLElement,
  ) {
    return this.#threadViewImplementation.registerHiddenCustomMessageNoticeProvider(
      provider,
    );
  }

  /**
   * @alpha
   * @internal
   */
  addCustomMessage(descriptor: Record<string, any>): CustomMessageView {
    const descriptorPropertyStream = kefirCast(Kefir, descriptor).toProperty();
    this.#driver.getLogger().eventSdkPassive('threadView.addCustomMessage');
    return this.#threadViewImplementation.addCustomMessage(
      descriptorPropertyStream,
    );
  }

  /**
   * @returns {MessageView[]} of all the loaded MessageView objects currently in the thread. @see MessageView for more information on what "loaded" means. Note that more messages may load into the thread later! If it's important to get future messages, use {@link Conversations#registerMessageViewHandler} instead.
   */
  getMessageViews(): Array<MessageView> {
    const threadViewImplementation = this.#threadViewImplementation;
    const membrane = this.#membrane;
    return threadViewImplementation
      .getMessageViewDrivers()
      .filter((messageViewDriver) => messageViewDriver.isLoaded())
      .map((messageViewDriver) => membrane.get(messageViewDriver));
  }

  getMessageViewsAll(): Array<MessageView> {
    const threadViewImplementation = this.#threadViewImplementation;
    const membrane = this.#membrane;

    return threadViewImplementation
      .getMessageViewDrivers()
      .map((messageViewDriver) => membrane.get(messageViewDriver));
  }

  getSubject(): string {
    return this.#threadViewImplementation.getSubject();
  }

  /**
   * @deprecated
   */
  getThreadID(): string {
    this.#driver
      .getLogger()
      .deprecationWarning(
        'threadView.getThreadID',
        'threadView.getThreadIDAsync',
      );
    return this.#threadViewImplementation.getThreadID();
  }

  getThreadIDAsync(): Promise<string> {
    return this.#threadViewImplementation.getThreadIDAsync();
  }

  addLabel(): SimpleElementView {
    return this.#threadViewImplementation.addLabel();
  }

  #bindToStreamEvents() {
    this.#threadViewImplementation.getEventStream().onEnd(() => {
      this.destroyed = true;
      this.emit('destroy');
      this.removeAllListeners();
    });
    this.#threadViewImplementation
      .getEventStream()
      .filter(function (event) {
        return event.type !== 'internal' && event.eventName === 'contactHover';
      })
      .onValue((event) => {
        const membrane = this.#membrane;
        this.emit(event.eventName, {
          contactType: event.contactType,
          messageView: membrane.get(event.messageViewDriver),
          contact: event.contact,
          threadView: this,
        });
      });
  }
}

export default ThreadView;
