import * as Kefir from 'kefir';
import get from '../../common/get-or-fail';
import ThreadView from '../views/conversations/thread-view';
import MessageView from '../views/conversations/message-view';
import AttachmentCardView from '../views/conversations/attachment-card-view';
import HandlerRegistry from '../lib/handler-registry';
import type Membrane from '../lib/Membrane';
import type { Driver } from '../driver-interfaces/driver';

const memberMap = new WeakMap();

export const MessageViewViewStates = Object.freeze({
  /**
   * One case where a {@link MessageView} is 'HIDDEN' is when there are too many messages in a thread,
   * and the message doesn't show at all.
   */
  HIDDEN: 'HIDDEN',
  /**
   * {@link MessageView}s are collapsed when they are partially shown. The {@link MessageView}'s subject line and timestamp is visible, but the body of the message may be truncated.
   */
  COLLAPSED: 'COLLAPSED',
  EXPANDED: 'EXPANDED',
});
export const MessageViewToolbarSectionNames = Object.freeze({
  MORE: 'MORE',
}); // documented in src/docs/

class Conversations {
  MessageViewViewStates: typeof MessageViewViewStates = MessageViewViewStates;
  MessageViewToolbarSectionNames: typeof MessageViewToolbarSectionNames =
    MessageViewToolbarSectionNames;

  constructor(appId: string, driver: Driver, membrane: Membrane) {
    const members = {
      appId,
      driver,
      threadViewHandlerRegistry: new HandlerRegistry(),
      messageViewHandlerRegistries: {
        all: new HandlerRegistry(),
        loaded: new HandlerRegistry(),
      },
      attachmentCardViewHandlerRegistry: new HandlerRegistry(),
    };
    memberMap.set(this, members);
    driver.getStopper().onValue(() => {
      members.threadViewHandlerRegistry.dumpHandlers();
      members.messageViewHandlerRegistries.all.dumpHandlers();
      members.messageViewHandlerRegistries.loaded.dumpHandlers();
    });
    driver
      .getAttachmentCardViewDriverStream()
      .filter((cardDriver) => cardDriver.getAttachmentType() === 'FILE')
      .onValue((attachmentCardViewDriver) => {
        const attachmentCardView = membrane.get(attachmentCardViewDriver);
        members.attachmentCardViewHandlerRegistry.addTarget(attachmentCardView);
      });

    _setupViewDriverWatcher(
      appId,
      driver.getThreadViewDriverStream().filter((t) => !t.isLoadingStub()),
      ThreadView,
      members.threadViewHandlerRegistry,
      this,
      membrane
    );

    _setupViewDriverWatcher(
      appId,
      driver.getMessageViewDriverStream(),
      MessageView,
      members.messageViewHandlerRegistries.all,
      this,
      membrane
    );

    _setupViewDriverWatcher(
      appId,
      driver.getMessageViewDriverStream().flatMap((messageViewDriver) =>
        messageViewDriver.isLoaded()
          ? Kefir.constant(messageViewDriver)
          : messageViewDriver
              .getEventStream()
              .filter((event) => event.eventName === 'messageLoad')
              .map(() => messageViewDriver)
              .take(1)
      ),
      MessageView,
      members.messageViewHandlerRegistries.loaded,
      this,
      membrane
    );
  }

  registerThreadViewHandler(handler: (v: ThreadView) => void): () => void {
    return get(memberMap, this).threadViewHandlerRegistry.registerHandler(
      handler
    );
  }

  registerMessageViewHandler(handler: (v: MessageView) => void): () => void {
    return get(
      memberMap,
      this
    ).messageViewHandlerRegistries.loaded.registerHandler(handler);
  }

  registerMessageViewHandlerAll(handler: (v: MessageView) => void): () => void {
    return get(
      memberMap,
      this
    ).messageViewHandlerRegistries.all.registerHandler(handler);
  }

  registerFileAttachmentCardViewHandler(
    handler: (v: AttachmentCardView) => void
  ): () => void {
    return get(
      memberMap,
      this
    ).attachmentCardViewHandlerRegistry.registerHandler(handler);
  }
}

function _setupViewDriverWatcher(
  appId: string,
  stream: Kefir.Observable<Record<string, any>, unknown>,
  ViewClass: typeof MessageView | typeof ThreadView,
  handlerRegistry: any,
  ConversationsInstance: any,
  membrane: Membrane
) {
  var combinedStream = stream.map(function (viewDriver) {
    const view = membrane.get(viewDriver);
    return {
      viewDriver,
      view,
    };
  });
  // A delay is currently necessary so that ThreadView can wait for its MessageViews.
  combinedStream
    .flatMap((event) =>
      event.viewDriver
        .getReadyStream()
        .map(() => event)
        .takeUntilBy(Kefir.fromEvents(event.view, 'destroy'))
    )
    .onValue(function (event: any) {
      handlerRegistry.addTarget(event.view);
    });
}

export default Conversations;
