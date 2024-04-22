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
   * Get the URL for the attachment card's download link as a promise for a string.
   * For FILE attachment cards, the URL will be a short-lived URL that can be
   * accessed without cookies. For CUSTOM attachment cards, the URL will be the
   * downloadUrl property of the card's download button if it has one, otherwise
   * null. Other attachment card types may not have a download URL, and the promise
   * may resolve to null.
   */
  getDownloadURL(): Promise<string | null | undefined> {
    return this.#attachmentCardImplementation.getDownloadURL();
  }

  getMessageView(): MessageView | null {
    const messageViewDriver =
      this.#attachmentCardImplementation.getMessageViewDriver();

    return messageViewDriver ? this.#membrane.get(messageViewDriver) : null;
  }

  private get _attachmentCardImplementation() {
    this.#driver
      .getLogger()
      .deprecationWarning(
        'AttachmentCardView._attachmentCardImplementation._element',
        'AttachmentCardView.getElement',
      );

    return {
      _element: this.getElement(),
    };
  }

  getElement(): HTMLElement {
    return this.#attachmentCardImplementation.getElement();
  }
}
