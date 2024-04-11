import type * as Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import SafeEventEmitter from '../../lib/safe-event-emitter';

export interface CustomMessageDescriptor {
  collapsedEl: HTMLElement;
  headerEl: HTMLElement;
  bodyEl: HTMLElement;
  iconUrl: string;
  sortDate: Date;
}

export default class CustomMessageView extends SafeEventEmitter {
  #el: HTMLElement;
  #iconEl: HTMLElement;
  #contentEl: HTMLElement;
  #contentHeaderEl: HTMLElement;
  #contentBodyEl: HTMLElement;
  destroyed: boolean = false;
  #stopper = kefirStopper();
  #isCollapsed: boolean = true;
  #lastDescriptor: CustomMessageDescriptor | null | undefined;

  constructor(
    descriptorStream: Kefir.Observable<CustomMessageDescriptor, unknown>,
    onReady: () => any,
  ) {
    super();

    this.#el = document.createElement('div');
    this.#el.classList.add('inboxsdk__custom_message_view');
    this.#el.classList.add('inboxsdk__custom_message_view_collapsed');

    this.#iconEl = document.createElement('div');
    this.#iconEl.classList.add('inboxsdk__custom_message_view_icon');

    this.#contentEl = document.createElement('div');
    this.#contentEl.classList.add('inboxsdk__custom_message_view_content');

    this.#contentHeaderEl = document.createElement('div');
    this.#contentHeaderEl.classList.add('inboxsdk__custom_message_view_header');

    this.#contentBodyEl = document.createElement('div');
    this.#contentBodyEl.classList.add('inboxsdk__custom_message_view_body');

    this.#el.appendChild(this.#iconEl);
    this.#el.appendChild(this.#contentEl);
    this.#el.addEventListener('click', (e: MouseEvent) => {
      if (this.#isCollapsed) {
        this.expand();
        e.preventDefault();
        e.stopPropagation();
      }
    });

    this.#contentHeaderEl.addEventListener('click', (e: MouseEvent) => {
      this.collapse();
      e.preventDefault();
      e.stopPropagation();
    });

    descriptorStream
      .takeUntilBy(this.#stopper)
      .onValue((descriptor) => {
        this.#el.setAttribute(
          'data-inboxsdk-sortdate',
          String(descriptor.sortDate.getTime()),
        );

        const previousDescriptor = this.#lastDescriptor;
        this.#lastDescriptor = descriptor;

        if (
          !previousDescriptor ||
          previousDescriptor.iconUrl !== descriptor.iconUrl
        ) {
          const img = document.createElement('img');
          img.src = descriptor.iconUrl;
          this.#iconEl.innerHTML = '';

          this.#iconEl.appendChild(img);
        }

        if (
          (!previousDescriptor ||
            previousDescriptor.collapsedEl !== descriptor.collapsedEl) &&
          this.#isCollapsed
        ) {
          if (previousDescriptor) previousDescriptor.collapsedEl.remove();

          this.#contentEl.appendChild(descriptor.collapsedEl);
        }

        if (
          !previousDescriptor ||
          previousDescriptor.headerEl !== descriptor.headerEl
        ) {
          if (previousDescriptor) previousDescriptor.headerEl.remove();

          this.#contentHeaderEl.appendChild(descriptor.headerEl);
        }

        if (
          !previousDescriptor ||
          previousDescriptor.bodyEl !== descriptor.bodyEl
        ) {
          if (previousDescriptor) previousDescriptor.bodyEl.remove();

          this.#contentBodyEl.appendChild(descriptor.bodyEl);
        }
      })
      .take(1)
      .onValue(onReady);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    this.#stopper.destroy();

    this.emit('destroy');

    this.#el.remove();
  }

  expand() {
    this.#isCollapsed = false;
    const descriptor = this.#lastDescriptor;
    if (descriptor) descriptor.collapsedEl.remove();

    this.#contentEl.appendChild(this.#contentHeaderEl);

    this.#contentEl.appendChild(this.#contentBodyEl);

    this.#el.classList.remove('inboxsdk__custom_message_view_collapsed');

    this.emit('expanded');
  }

  collapse() {
    this.#isCollapsed = true;

    this.#contentHeaderEl.remove();

    this.#contentBodyEl.remove();

    const descriptor = this.#lastDescriptor;

    if (descriptor) {
      this.#contentEl.appendChild(descriptor.collapsedEl);
    }

    this.#el.classList.add('inboxsdk__custom_message_view_collapsed');

    this.emit('collapsed');
  }

  getElement() {
    return this.#el;
  }

  getSortDate() {
    if (this.#lastDescriptor) return this.#lastDescriptor.sortDate;
    else return null;
  }
}
