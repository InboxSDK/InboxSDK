import EventEmitter from '../../lib/safe-event-emitter';
import type Membrane from '../../lib/Membrane';
import type MessageView from './message-view';
import type {
  Driver,
  AttachmentCardViewDriver,
} from '../../driver-interfaces/driver';
import type { CustomButtonDescriptor } from '../../dom-driver/gmail/views/gmail-attachment-card-view';
import TypedEventEmitter from 'typed-emitter';

export default class AttachmentCardView extends (EventEmitter as new () => TypedEventEmitter<{
  destroy(): void;
}>) {
  #attachmentCardImplementation: AttachmentCardViewDriver;
  #driver: Driver;
  #membrane: Membrane;
  destroyed: boolean = false;

  constructor(
    attachmentCardImplementation: AttachmentCardViewDriver,
    driver: Driver,
    membrane: Membrane,
  ) {
    super();
    this.#driver = driver;
    this.#membrane = membrane;
    this.#attachmentCardImplementation = attachmentCardImplementation;

    this.#attachmentCardImplementation.getStopper().onValue(() => {
      this.destroyed = true;
      this.emit('destroy');
    });
  }

  getAttachmentType() {
    return this.#attachmentCardImplementation.getAttachmentType();
  }

  addButton(buttonOptions: CustomButtonDescriptor) {
    this.#attachmentCardImplementation.addButton(buttonOptions);
  }

  getTitle(): string {
    return this.#attachmentCardImplementation.getTitle();
  }

  /**
   * @deprecated  Please use the same-named method on the AttachmentCardClickEvent object instead.
   */
  getDownloadURL(): Promise<string | null | undefined> {
    this.#driver
      .getLogger()
      .deprecationWarning(
        'AttachmentCardView.getDownloadURL',
        'AttachmentCardView.addButton -> onClick -> AttachmentCardClickEvent',
      );

    if (this.#driver.getOpts().REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }

    return this.#attachmentCardImplementation.getDownloadURL();
  }

  getMessageView(): MessageView | null {
    const messageViewDriver =
      this.#attachmentCardImplementation.getMessageViewDriver();

    return messageViewDriver ? this.#membrane.get(messageViewDriver) : null;
  }
}
