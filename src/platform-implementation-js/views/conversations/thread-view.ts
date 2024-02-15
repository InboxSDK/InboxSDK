import { defonce } from 'ud';
import EventEmitter from '../../lib/safe-event-emitter';
import type Membrane from '../../lib/Membrane';
import type SimpleElementView from '../../views/SimpleElementView';
import kefirCast from 'kefir-cast';
import Kefir, { type Observable } from 'kefir';
import ContentPanelView from '../content-panel-view';
import get from '../../../common/get-or-fail';
import type MessageView from './message-view';
import type { Driver, ThreadViewDriver } from '../../driver-interfaces/driver';
import type CustomMessageView from '../../views/conversations/custom-message-view';
import type { ButtonDescriptor, Contact } from '../../../inboxsdk';
import type TypedEventEmitter from 'typed-emitter';
import { type ContentPanelDescriptor } from '../../driver-common/sidebar/ContentPanelViewDriver';
import { Descriptor } from '../../../types/descriptor';

interface Members {
  threadViewImplementation: ThreadViewDriver;
  appId: string;
  driver: Driver;
  membrane: Membrane;
}

export type ThreadViewEvents = {
  destroy(): void;
  contactHover(data: {
    messageView: MessageView;
    contact: Contact;
    threadView: ThreadView;
  }): void;
};

const memberMap = defonce(module, () => new WeakMap<ThreadView, Members>());

class ThreadView extends (EventEmitter as new () => TypedEventEmitter<ThreadViewEvents>) {
  destroyed = false;

  constructor(
    threadViewImplementation: ThreadViewDriver,
    appId: string,
    driver: Driver,
    membrane: Membrane,
  ) {
    super();
    const members = {
      threadViewImplementation,
      appId,
      driver,
      membrane,
    };
    memberMap.set(this, members);

    _bindToStreamEvents(this, threadViewImplementation);
  }

  addSidebarContentPanel(
    descriptor:
      | ContentPanelDescriptor
      | Observable<ContentPanelDescriptor, unknown>,
  ): ContentPanelView {
    const descriptorPropertyStream: Observable<
      ContentPanelDescriptor,
      unknown
    > = kefirCast(Kefir, descriptor).toProperty();
    const members = get(memberMap, this);
    members.driver
      .getLogger()
      .eventSdkPassive('threadView.addSidebarContentPanel');
    const contentPanelImplementation =
      members.threadViewImplementation.addSidebarContentPanel(
        descriptorPropertyStream,
      );

    if (contentPanelImplementation) {
      return new ContentPanelView(contentPanelImplementation);
    }

    return null!;
  }

  addNoticeBar(): SimpleElementView {
    const members = get(memberMap, this);
    return members.threadViewImplementation.addNoticeBar();
  }

  registerHiddenCustomMessageNoticeProvider(
    provider: (
      numberCustomMessagesHidden: number,
      numberNativeMessagesHidden: number | null | undefined,
      unmountPromise: Promise<void>,
    ) => HTMLElement,
  ) {
    const members = get(memberMap, this);
    return members.threadViewImplementation.registerHiddenCustomMessageNoticeProvider(
      provider,
    );
  }

  addCustomMessage(descriptor: Record<string, any>): CustomMessageView {
    const descriptorPropertyStream = kefirCast(
      Kefir as any,
      descriptor,
    ).toProperty();
    const members = get(memberMap, this);
    members.driver.getLogger().eventSdkPassive('threadView.addCustomMessage');
    return members.threadViewImplementation.addCustomMessage(
      descriptorPropertyStream,
    );
  }

  getMessageViews(): Array<MessageView> {
    const { threadViewImplementation, membrane } = get(memberMap, this);
    return threadViewImplementation
      .getMessageViewDrivers()
      .filter((messageViewDriver) => messageViewDriver.isLoaded())
      .map((messageViewDriver) => membrane.get(messageViewDriver));
  }

  getMessageViewsAll(): Array<MessageView> {
    const { threadViewImplementation, membrane } = get(memberMap, this);
    return threadViewImplementation
      .getMessageViewDrivers()
      .map((messageViewDriver) => membrane.get(messageViewDriver));
  }

  getSubject(): string {
    return get(memberMap, this).threadViewImplementation.getSubject();
  }

  getThreadID(): string {
    get(memberMap, this)
      .driver.getLogger()
      .deprecationWarning(
        'threadView.getThreadID',
        'threadView.getThreadIDAsync',
      );
    return get(memberMap, this).threadViewImplementation.getThreadID();
  }

  getThreadIDAsync(): Promise<string> {
    return get(memberMap, this).threadViewImplementation.getThreadIDAsync();
  }

  addLabel(): SimpleElementView {
    return get(memberMap, this).threadViewImplementation.addLabel();
  }

  addSubjectButton(buttonDescriptor: Descriptor<ButtonDescriptor>) {
    return get(memberMap, this).threadViewImplementation.addSubjectButton(
      buttonDescriptor,
    );
  }

  addFooterButton(buttonDescriptor: Descriptor<ButtonDescriptor>) {
    return get(memberMap, this).threadViewImplementation.addFooterButton(
      buttonDescriptor,
    );
  }
}

export default ThreadView;

function _bindToStreamEvents(
  threadView: ThreadView,
  threadViewImplementation: ThreadViewDriver,
) {
  threadViewImplementation.getEventStream().onEnd(function () {
    threadView.destroyed = true;
    threadView.emit('destroy');
    threadView.removeAllListeners();
  });
  threadViewImplementation
    .getEventStream()
    .filter(function (event) {
      return event.type !== 'internal' && event.eventName === 'contactHover';
    })
    .onValue(function (event) {
      const { membrane } = get(memberMap, threadView);
      threadView.emit(event.eventName, {
        contactType: event.contactType,
        messageView: membrane.get(event.messageViewDriver),
        contact: event.contact,
        threadView: threadView,
      });
    });
}
