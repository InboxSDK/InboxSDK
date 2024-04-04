import Kefir, { type Observable } from 'kefir';
import kefirCast from 'kefir-cast';
import kefirStopper from 'kefir-stopper';
import EventEmitter from '../lib/safe-event-emitter';
import type { Driver } from '../driver-interfaces/driver';
import type { PiOpts } from '../platform-implementation';
import type Membrane from '../lib/Membrane';
import AppToolbarButtonView from '../views/app-toolbar-button-view';
import { SECTION_NAMES } from '../constants/toolbars';
import type {
  AppToolbarButtonDescriptor,
  DropdownView,
  KeyboardShortcutHandle,
  RouteView,
  ThreadRowView,
  ThreadView,
} from '../../inboxsdk';

export interface ToolbarButtonOnClickEvent {
  selectedThreadViews: Array<ThreadView>;
  selectedThreadRowViews: Array<ThreadRowView>;
  dropdown?: DropdownView;
  threadView?: ThreadView;
}

export interface LegacyToolbarButtonDescriptor {
  title: string;
  iconUrl?: string;
  iconClass?: string;
  section: 'INBOX_STATE' | 'METADATA_STATE' | 'OTHER';
  onClick(event: ToolbarButtonOnClickEvent): void;
  hasDropdown?: boolean;
  hideFor?: (routeView: RouteView) => boolean;
  keyboardShortcutHandle?: KeyboardShortcutHandle;
  orderHint?: number;
}

export interface ToolbarButtonDescriptor {
  title: string;
  iconUrl?: string;
  iconClass?: string;
  positions?: Array<'THREAD' | 'ROW' | 'LIST'> | null;
  threadSection?: string;
  listSection?: string;
  onClick(event: ToolbarButtonOnClickEvent): void;
  hasDropdown: boolean;
  hideFor?: (routeView: RouteView) => boolean;
  keyboardShortcutHandle?: KeyboardShortcutHandle;
  orderHint?: number;
}

export default class Toolbars extends EventEmitter {
  #driver;
  #membrane;
  #piOpts;

  SectionNames = SECTION_NAMES;

  constructor(
    appId: string,
    driver: Driver,
    membrane: Membrane,
    piOpts: PiOpts,
  ) {
    super();
    this.#driver = driver;
    this.#membrane = membrane;
    this.#piOpts = piOpts;
  }

  /**
   * Registers a toolbar button to appear on thread rows, above the thread list when some rows are checked, and above threads.
   *
   * @returns a function which removes the button registration.
   */
  registerThreadButton(buttonDescriptor: ToolbarButtonDescriptor) {
    if (
      (buttonDescriptor.listSection === 'OTHER' ||
        buttonDescriptor.threadSection === 'OTHER') &&
      buttonDescriptor.hasDropdown
    ) {
      this.#driver
        .getLogger()
        .errorApp(
          new Error(
            'registerThreadButton does not support listSection=OTHER or threadSection=OTHER and hasDropdown=true together',
          ),
        );
      buttonDescriptor = { ...buttonDescriptor, hasDropdown: false };
    }

    const { hideFor, ..._buttonDescriptor } = buttonDescriptor;

    const registerThreadButton = () => {
      return this.#driver.registerThreadButton({
        ..._buttonDescriptor,
        onClick: (event: any) => {
          if (!_buttonDescriptor.onClick) return;

          _buttonDescriptor.onClick({
            // Is this shape correct, or do we want positions here instead?
            position: event.position,
            dropdown: event.dropdown,
            selectedThreadViews: event.selectedThreadViewDrivers.map((x: any) =>
              this.#membrane.get(x),
            ),
            selectedThreadRowViews: event.selectedThreadRowViewDrivers.map(
              (x: any) => this.#membrane.get(x),
            ),
          } as any);
        },
      });
    };

    if (!hideFor) {
      return registerThreadButton();
    } else {
      const stopper = kefirStopper();
      let currentRemover: null | (() => void) = null;
      this.#driver
        .getRouteViewDriverStream()
        .takeUntilBy(stopper)
        .onValue((routeViewDriver) => {
          const routeView = this.#membrane.get(routeViewDriver);

          if (hideFor(routeView)) {
            if (currentRemover) {
              currentRemover();
              currentRemover = null;
            }
          } else {
            if (!currentRemover) {
              currentRemover = registerThreadButton();
            }
          }
        });
      return () => {
        stopper.destroy();

        if (currentRemover) {
          currentRemover();
          currentRemover = null;
        }
      };
    }
  }

  /**
   * @deprecated This method is deprecated in favor of {@link Toolbars.registerThreadButton}.
   *
   * Registers a toolbar button to appear above any list page such as the Inbox or Sent Mail.
   */
  registerToolbarButtonForList(buttonDescriptor: Record<string, any>) {
    return this.registerThreadButton({
      positions: ['LIST'],
      listSection: buttonDescriptor.section,
      title: buttonDescriptor.title,
      iconUrl: buttonDescriptor.iconUrl,
      iconClass: buttonDescriptor.iconClass,
      onClick: (event: any) => {
        if (!buttonDescriptor.onClick) return;
        buttonDescriptor.onClick({
          dropdown: event.dropdown,
          selectedThreadRowViews: event.selectedThreadRowViews,

          get threadRowViews() {
            this.#driver
              .getLogger()
              .deprecationWarning(
                'Toolbars.registerToolbarButtonForList onClick event.threadRowViews',
              );
            return event.selectedThreadRowViews;
          },
        });
      },
      hasDropdown: buttonDescriptor.hasDropdown,
      orderHint: buttonDescriptor.orderHint,
      hideFor: buttonDescriptor.hideFor,
      keyboardShortcutHandle: buttonDescriptor.keyboardShortcutHandle,
    });
  }

  /**
   * @deprecated This function is deprecated in favor of {@link Toolbars#registerThreadButton}.
   *
   * Registers a toolbar button to appear when viewing a thread.
   */
  registerToolbarButtonForThreadView(
    buttonDescriptor: LegacyToolbarButtonDescriptor,
  ) {
    return this.registerThreadButton({
      positions: ['THREAD'],
      threadSection: buttonDescriptor.section,
      title: buttonDescriptor.title,
      iconUrl: buttonDescriptor.iconUrl,
      iconClass: buttonDescriptor.iconClass,
      onClick: (event: any) => {
        if (event.selectedThreadViews.length !== 1)
          throw new Error('should not happen');
        if (!buttonDescriptor.onClick) return;
        buttonDescriptor.onClick({
          dropdown: event.dropdown,
          threadView: event.selectedThreadViews[0],
        } as any);
      },
      hasDropdown: buttonDescriptor.hasDropdown!,
      orderHint: buttonDescriptor.orderHint,
      hideFor: buttonDescriptor.hideFor,
      keyboardShortcutHandle: buttonDescriptor.keyboardShortcutHandle,
    });
  }

  /** @deprecated */
  setAppToolbarButton(
    appToolbarButtonDescriptor:
      | AppToolbarButtonDescriptor
      | Observable<AppToolbarButtonDescriptor, any>,
  ) {
    this.#driver
      .getLogger()
      .deprecationWarning(
        'Toolbars.setAppToolbarButton',
        'Toolbars.addToolbarButtonForApp',
      );

    if (this.#piOpts.REQUESTED_API_VERSION !== 1) {
      throw new Error('This method was discontinued after API version 1');
    }

    return this.addToolbarButtonForApp(appToolbarButtonDescriptor);
  }

  /**
   * Adds a button and dropdown to the "Global Toolbar". This is typically used to show a dropdown with general information about your application. In Gmail, this refers to the navigation area at the top right of the window.
   */
  addToolbarButtonForApp(
    buttonDescriptor:
      | AppToolbarButtonDescriptor
      | Observable<AppToolbarButtonDescriptor, any>,
  ) {
    const buttonDescriptorStream: Observable<AppToolbarButtonDescriptor, any> =
      kefirCast(Kefir, buttonDescriptor);
    const appToolbarButtonViewDriverPromise =
      this.#driver.addToolbarButtonForApp(buttonDescriptorStream);
    const appToolbarButtonView = new AppToolbarButtonView(
      this.#driver,
      appToolbarButtonViewDriverPromise,
    );
    return appToolbarButtonView;
  }
}
