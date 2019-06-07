import asap from 'asap';
import EventEmitter from '../../lib/safe-event-emitter';
import Kefir from 'kefir';

import makeMutationObserverChunkedStream from '../../lib/dom/make-mutation-observer-chunked-stream';
import ScrollableContainByScreen from '../../lib/ScrollableContainByScreen';
import outsideClicksAndEscape, {
  OutsideEvent
} from '../../lib/dom/outsideClicksAndEscape';
import { Options as ContainByScreenOptions } from 'contain-by-screen';

interface Options {
  manualPosition?: boolean;
  extraElementsToIgnore?: HTMLElement[];
}

// documented in src/docs/
export default class DropdownView extends EventEmitter {
  private _dropdownViewDriver: any;
  public destroyed: boolean = false;
  /*deprecated*/ public closed: boolean = false;
  private _options: Options;
  private _userPlacementOptions: ContainByScreenOptions = { hAlign: 'left' };
  private _scrollableContainByScreen:
    | ScrollableContainByScreen
    | null
    | undefined = null;
  private _didInsertContainerEl: boolean;
  public el: HTMLElement;

  public constructor(
    dropdownViewDriver: any,
    anchorElement: HTMLElement,
    options: Options | null | undefined
  ) {
    super();

    this._dropdownViewDriver = dropdownViewDriver;
    this._options = {
      ...(dropdownViewDriver.getDropdownOptions &&
        dropdownViewDriver.getDropdownOptions()),
      ...options
    };
    this.el = dropdownViewDriver.getContentElement();

    const containerEl = dropdownViewDriver.getContainerElement();
    if (document.contains(containerEl)) {
      this._didInsertContainerEl = false;
    } else {
      document.body.insertBefore(containerEl, document.body.firstElementChild);
      this._didInsertContainerEl = true;
    }

    if (!containerEl.hasAttribute('tabindex')) {
      // makes the element focusable, but not tab-focusable
      containerEl.setAttribute('tabindex', '-1');
    }

    const onDestroy = Kefir.fromEvents(this, 'destroy');

    const elementsToIgnore = [anchorElement, containerEl];
    if (this._options.extraElementsToIgnore) {
      elementsToIgnore.push(...this._options.extraElementsToIgnore);
    }

    outsideClicksAndEscape(elementsToIgnore)
      .takeUntilBy(onDestroy)
      .filter(_event => {
        // TODO this cast is necessary because of a Typescript def issue
        const event = _event as OutsideEvent;

        let isCanceled = false;
        const appEvent = {
          type: event.type,
          cause: event.cause,
          cancel: () => {
            isCanceled = true;
          }
        };
        this.emit('preautoclose', appEvent);
        return !isCanceled;
      })
      .onValue(() => {
        this.close();
      });

    if (!this._options.manualPosition) {
      containerEl.style.position = 'fixed';

      asap(() => {
        if (this.closed) return;

        Kefir.fromEvents(this, '_placementOptionsUpdated')
          .toProperty(() => null)
          .takeUntilBy(onDestroy)
          .onValue(() => {
            if (this._scrollableContainByScreen) {
              this._scrollableContainByScreen.destroy();
            }
            this._scrollableContainByScreen = new ScrollableContainByScreen(
              containerEl,
              anchorElement,
              this._userPlacementOptions
            );
          });

        makeMutationObserverChunkedStream(
          dropdownViewDriver.getContentElement(),
          {
            childList: true,
            attributes: true,
            characterData: true,
            subtree: true
          }
        )
          .throttle(200)
          .takeUntilBy(onDestroy)
          .onValue(() => this.reposition());
      });
    }

    const startActiveElement = document.activeElement;
    asap(() => {
      if (this.closed) return;
      if (document.activeElement !== startActiveElement) return;

      // Needs to happen after it's been positioned.
      containerEl.focus();
    });
  }

  public setPlacementOptions(options: ContainByScreenOptions) {
    if (this._options.manualPosition) {
      // eslint-disable-next-line no-console
      console.error(
        'DropdownView.setPlacementOptions() was called on a manually-positioned DropdownView.'
      );
      return;
    }
    this._userPlacementOptions = { ...this._userPlacementOptions, ...options };
    this.emit('_placementOptionsUpdated');
  }

  public close() {
    if (!this.destroyed) {
      this.destroyed = this.closed = true;
      if (this._scrollableContainByScreen) {
        this._scrollableContainByScreen.destroy();
      }
      this.emit('destroy');
      if (this._didInsertContainerEl) {
        this._dropdownViewDriver.getContainerElement().remove();
      }
      this._dropdownViewDriver.destroy();
    }
  }

  public reposition() {
    if (this._scrollableContainByScreen) {
      this._scrollableContainByScreen.reposition();
    }
  }
}
