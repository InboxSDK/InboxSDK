import last from 'lodash/last';
import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import streamWaitFor from '../../../lib/stream-wait-for';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import GmailElementGetter from '../gmail-element-getter';
import type GmailDriver from '../gmail-driver';
import isComposeTitleBarLightColor from '../is-compose-titlebar-light-color';
import * as styles from './mole-view.module.css';
import cx from 'classnames';

export type MoleButtonDescriptor = {
  title: string;
  iconUrl: string;
  iconClass?: string;
  onClick: (...args: Array<any>) => any;
};

export type MoleOptions = {
  el: HTMLElement;
  className?: string;
  title?: string;
  titleEl?: HTMLElement;
  minimizedTitleEl?: HTMLElement;
  titleButtons?: MoleButtonDescriptor[];
  chrome?: boolean;
};

const INBOXSDK_CLASS = 'inboxsdk__mole_view' as const;

class GmailMoleViewDriver {
  #driver: GmailDriver;
  #eventStream = kefirBus<
    {
      eventName: 'minimize' | 'restore';
    },
    unknown
  >();
  #stopper = kefirStopper();
  #element: HTMLElement;

  constructor(driver: GmailDriver, options: MoleOptions) {
    this.#driver = driver;
    this.#element = Object.assign(document.createElement('div'), {
      className: cx(INBOXSDK_CLASS, options.className),
      innerHTML: getHTMLString(options),
    });

    if (options.chrome === false) {
      this.#element.classList.add('inboxsdk__mole_view_chromeless');
    } else {
      querySelector(
        this.#element,
        '.inboxsdk__mole_view_titlebar',
      ).addEventListener('click', (e: MouseEvent) => {
        this.setMinimized(!this.getMinimized());
        e.preventDefault();
        e.stopPropagation();
      });
      const minimizeBtn = querySelector(this.#element, '.Hl');
      minimizeBtn.addEventListener('click', (e: MouseEvent) => {
        this.setMinimized(true);
        e.preventDefault();
        e.stopPropagation();
      });
      const maximizeBtn = querySelector(this.#element, '.Hk');
      maximizeBtn.addEventListener('click', (e: MouseEvent) => {
        this.setMinimized(false);
        e.preventDefault();
        e.stopPropagation();
      });
      const closeBtn = querySelector(this.#element, '.Ha');
      closeBtn.addEventListener('click', (e: MouseEvent) => {
        this.destroy();
        e.preventDefault();
        e.stopPropagation();
      });

      if (options.titleEl) {
        this.#setTitleEl(options.titleEl);
      } else {
        this.setTitle(options.title || '');
      }

      if (options.minimizedTitleEl) {
        this.#setMinimizedTitleEl(options.minimizedTitleEl);
      }

      const titleButtons = options.titleButtons;

      if (titleButtons) {
        const titleButtonContainer = querySelector(
          this.#element,
          '.inboxsdk__mole_title_buttons',
        );
        const lastChild: HTMLElement =
          titleButtonContainer.lastElementChild as any;
        titleButtons.forEach((titleButton) => {
          const img: HTMLImageElement = document.createElement('img') as any;

          if (titleButton.iconClass) {
            img.className = titleButton.iconClass;
          }

          img.setAttribute('data-tooltip', titleButton.title);
          img.addEventListener('click', (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            titleButton.onClick.call(null);
          });
          img.src = titleButton.iconUrl;
          titleButtonContainer.insertBefore(img, lastChild);
        });
      }
    }

    querySelector(this.#element, '.inboxsdk__mole_view_content').appendChild(
      options.el,
    );
  }

  show() {
    const doShow = (moleParent: HTMLElement) => {
      const leftMoleSpacer = moleParent.firstChild;
      const rightMoleSpacer = moleParent.lastChild;

      if (
        leftMoleSpacer instanceof HTMLElement &&
        !leftMoleSpacer.style.order
      ) {
        this.#driver.logger.error(
          new Error('leftMoleSpacer has no style.order property set'),
        );
      } else if (leftMoleSpacer instanceof HTMLElement) {
        /**
         * 2023-10-02 When Google Chat is enabled, we need to keep track of the `order` style property for moles added.
         * If we don't, we end up with moles added on top of the sidebar because the moleParent is using `order` for layout, and any child without `order` set will be forced to the right edge of the page.
         */
        const order = leftMoleSpacer.style.order;
        const orderNumber = parseInt(order, 10);

        if (isFinite(orderNumber)) {
          this.#element.style.order = `${orderNumber - 1}`;
        }

        for (const existingMole of document.querySelectorAll<HTMLElement>(
          INBOXSDK_CLASS,
        )) {
          const existingOrder = existingMole.style.order;
          const existingOrderNumber = parseInt(existingOrder, 10);

          if (isFinite(existingOrderNumber)) {
            existingMole.style.order = `${existingOrderNumber - 1}`;
          }
        }
      }

      if (rightMoleSpacer instanceof HTMLElement) {
        moleParent.insertBefore(this.#element, rightMoleSpacer);
      } else {
        this.#driver.logger.error(
          new Error(
            'Mole show invariant violated. `lastMole` is not an HTMLElement',
          ),
        );
        return;
      }

      const dw = moleParent.closest('div.dw');

      if (dw) {
        dw.classList.add('inboxsdk__moles_in_use', styles.inboxsdkMolesInUse);
      }
    };

    const moleParent = GmailElementGetter.getMoleParent();

    if (moleParent) {
      doShow(moleParent);
    } else {
      const moleParentReadyEvent = streamWaitFor(() =>
        GmailElementGetter.getMoleParent(),
      )
        .takeUntilBy(this.#stopper)
        .onValue(doShow);
      // For some users, the mole parent element seems to be lazily loaded by
      // Gmail only once the user has used a compose view or a thread view.
      // If the gmail mode has settled, we've been loaded for 10 seconds, and
      // we don't have the mole parent yet, then force the mole parent to load
      // by opening a compose view and then closing it.
      Kefir.fromPromise(GmailElementGetter.waitForGmailModeToSettle())
        .flatMap(() => {
          // delay until we've passed TimestampOnReady + 10 seconds
          return this.#driver.delayToTimeAfterReady(10 * 1000);
        })
        .takeUntilBy(moleParentReadyEvent)
        .takeUntilBy(this.#stopper)
        .onValue(() => {
          this.#driver.getLogger().eventSdkActive('mole parent force load');

          this.#driver.openNewComposeViewDriver().then((gmailComposeView) => {
            gmailComposeView.close();
          });
        });
    }
  }

  setMinimized(minimized: boolean) {
    if (minimized) {
      this.#element.classList.add('inboxsdk__minimized');

      this.#eventStream.emit({
        eventName: 'minimize',
      });
    } else {
      this.#element.classList.remove('inboxsdk__minimized');

      // If the mole is off the left edge of the screen, then move it to the
      // right.
      const moleParent = this.#element.parentElement;

      if (moleParent && this.#element.getBoundingClientRect().left < 0) {
        moleParent.insertBefore(this.#element, last(moleParent.children)!);
      }

      this.#eventStream.emit({
        eventName: 'restore',
      });
    }
  }

  getMinimized(): boolean {
    return this.#element.classList.contains('inboxsdk__minimized');
  }

  setTitle(text: string) {
    const titleElement = this.#element.querySelector(
      '.inboxsdk__mole_view_titlebar h2.inboxsdk__mole_default',
    );

    if (titleElement) {
      titleElement.textContent = text;
    }
  }

  #setTitleEl(el: HTMLElement) {
    const container = this.#element.querySelector(
      '.inboxsdk__mole_view_titlebar h2.inboxsdk__mole_default',
    );

    if (container) {
      container.textContent = '';
      container.appendChild(el);
    }
  }

  #setMinimizedTitleEl(el: HTMLElement) {
    const container = this.#element.querySelector(
      '.inboxsdk__mole_view_titlebar h2.inboxsdk__mole_minimized',
    );

    if (container) {
      this.#element.classList.add('inboxsdk__mole_use_minimize_title');

      container.textContent = '';
      container.appendChild(el);
    }
  }

  getEventStream() {
    return this.#eventStream;
  }

  destroy() {
    this.#element.remove();

    this.#eventStream.end();

    this.#stopper.destroy();
  }
}

export default GmailMoleViewDriver;

function getHTMLString(options: MoleOptions) {
  const originalView = !isComposeTitleBarLightColor();
  return `
    <div class="inboxsdk__mole_view_inner ${
      originalView ? 'inboxsdk__original_view' : ''
    }">
      ${getTitleHTMLString(options)}
      <div class="inboxsdk__mole_view_content ${
        originalView ? 'inboxsdk__original_view' : ''
      }"></div>
    </div>
  `;
}

function getTitleHTMLString(options: MoleOptions) {
  if (options.chrome === false) {
    return '';
  } else {
    const originalView = !isComposeTitleBarLightColor();
    return `
      <div class="inboxsdk__mole_view_titlebar${
        originalView ? ' inboxsdk__original_view' : ''
      }">
        <div class="inboxsdk__mole_title_buttons${
          originalView ? ' inboxsdk__original_view' : ''
        }">
          <img class="Hl" src="images/cleardot.gif" alt="Minimize" aria-label="Minimize" data-tooltip-delay="800" data-tooltip="Minimize"><img class="Hk" id=":rp" src="images/cleardot.gif" alt="Minimize" aria-label="Maximize" data-tooltip-delay="800" data-tooltip="Maximize"><!--<img class="Hq aUG" src="images/cleardot.gif" alt="Pop-out" aria-label="Full-screen (Shift for Pop-out)" data-tooltip-delay="800" data-tooltip="Full-screen (Shift for Pop-out)">--><img class="Ha" src="images/cleardot.gif" alt="Close" aria-label="Close" data-tooltip-delay="800" data-tooltip="Close">
        </div>
        <h2 class="inboxsdk__mole_default"></h2>
        <h2 class="inboxsdk__mole_minimized"></h2>
      </div>`;
  }
}
