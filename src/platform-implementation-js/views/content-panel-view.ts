import EventEmitter from '../lib/safe-event-emitter';
import get from '../../common/get-or-fail';
import type ContentPanelViewDriver from '../driver-common/sidebar/ContentPanelViewDriver';
import type TypedEventEmitter from 'typed-emitter';
import * as Kefir from 'kefir';
import makeElementChildStream from '../lib/dom/make-element-child-stream';

const RIGHT_SIDE_SPACER_WIDTH_PANEL_OPEN = '386px';
const DEFAULT_RIGHT_SIDE_SPACER_WIDTH = '66px';

interface Members {
  contentPanelViewImplementation: ContentPanelViewDriver;
}
const membersMap = new WeakMap<ContentPanelView, Members>();

export default class ContentPanelView extends (EventEmitter as new () => TypedEventEmitter<{
  activate(): void;
  deactivate(): void;
  destroy(): void;
}>) {
  destroyed: boolean = false;

  constructor(contentPanelViewImplementation: ContentPanelViewDriver) {
    super();
    const members = {
      contentPanelViewImplementation,
    };
    membersMap.set(this, members);

    this.#bindToStreamEvents();
    this.#setupMolePositioningContainerWatcher();
  }

  remove() {
    get(membersMap, this).contentPanelViewImplementation.remove();
  }

  close() {
    get(membersMap, this).contentPanelViewImplementation.close();
  }

  open() {
    get(membersMap, this).contentPanelViewImplementation.open();
  }

  isActive(): boolean {
    return get(membersMap, this).contentPanelViewImplementation.isActive();
  }

  #bindToStreamEvents() {
    const stream = get(
      membersMap,
      this,
    ).contentPanelViewImplementation.getEventStream();
    stream.onValue(({ eventName }) => {
      this.emit(eventName);
    });
    stream.onEnd(() => {
      this.destroyed = true;
      this.emit('destroy');
    });
  }

  #setupMolePositioningContainerWatcher() {
    const contentPanelImplementation = get(
      membersMap,
      this,
    ).contentPanelViewImplementation;
    const stopper = contentPanelImplementation.getStopper();
    let trackedElement: HTMLElement | null = null;

    const setRightSideSpacerWidth = (
      containerElement: Element,
      width: string,
    ) => {
      if (
        containerElement instanceof HTMLElement &&
        containerElement.lastElementChild
      ) {
        const lastChild = containerElement.lastElementChild as HTMLElement;
        if (lastChild.style !== undefined) {
          lastChild.style.width = width;
          trackedElement = containerElement;
        }
      }
    };

    const resetSpacerWidth = () => {
      if (trackedElement && trackedElement.lastElementChild) {
        const lastChild = trackedElement.lastElementChild as HTMLElement;
        if (lastChild.style !== undefined) {
          lastChild.style.width = DEFAULT_RIGHT_SIDE_SPACER_WIDTH;
        }
      }
      trackedElement = null;
    };

    // When we open the panel we need to adjust the mole positioning container
    // we need to set it directly because gmail sets it directly so we can't use a class
    this.on('activate', () => {
      const initialMolePositioningContainer = document.querySelector('div.dw');
      if (initialMolePositioningContainer) {
        setRightSideSpacerWidth(
          initialMolePositioningContainer,
          RIGHT_SIDE_SPACER_WIDTH_PANEL_OPEN,
        );
      }

      // Also watch for if a mole is opened while panel is active
      makeElementChildStream(document.body)
        .map((event) => event.el)
        .filter(
          (el): el is HTMLElement =>
            el instanceof HTMLElement && el.classList.contains('dw'),
        )
        .takeUntilBy(
          Kefir.merge([stopper, Kefir.fromEvents(this, 'deactivate').take(1)]),
        )
        .onValue((molePositioningContainer) => {
          setRightSideSpacerWidth(
            molePositioningContainer,
            RIGHT_SIDE_SPACER_WIDTH_PANEL_OPEN,
          );
        });
    });

    // Listen for deactivate events to reset width when panel closes
    this.on('deactivate', resetSpacerWidth);

    // Also reset width when content panel is destroyed
    stopper.onValue(resetSpacerWidth);
  }
}
