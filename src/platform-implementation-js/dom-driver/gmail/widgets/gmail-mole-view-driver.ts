import * as Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import GmailElementGetter from '../gmail-element-getter';
import type GmailDriver from '../gmail-driver';
import isComposeTitleBarLightColor from '../is-compose-titlebar-light-color';
import * as styles from './mole-view.module.css';
import cx from 'classnames';
import PageParserTree from 'page-parser-tree';
import censorHTMLtree from '../../../../common/censorHTMLtree';
import isNotNil from '../../../../common/isNotNil';

export type MoleButtonDescriptor = {
  title: string;
  iconUrl?: string;
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

const enum Selector {
  MoleParent = '.dw .nH > .nH > .no',
  /**
   * Compose and SDK mole selector.
   *
   * @note 2023-10-11 on :not selectors:
   *
   * style*="order: 2147483647;" is the left mole spacer.
   *
   * style*="order: 0;" is the right mole spacer.
   *
   * .aJl is the chat placeholder.
   */
  Mole = `${Selector.MoleParent} > *:not([style*="order: 0;"], [style*="order: 2147483647;"], .aJl)`,
  ComposeMole = `${Selector.Mole}.nn.nH`,
  ChatMolePlaceholder = `${Selector.MoleParent} > .aJl`,
}

const enum Tag {
  Mole = 'mole',
  MoleParent = 'moleParent',
}

class GmailMoleViewDriver {
  static #page: PageParserTree;
  static #moleParentReadyEvent = kefirBus<HTMLElement, unknown>();
  static #moleParent?: HTMLElement;

  static {
    this.#page = new PageParserTree(document, {
      logError(err, el) {
        const details = {
          el,
          html: el ? censorHTMLtree(el) : null,
        };
        // ignore 'errors' that seem to be warnings instead...
        if (
          err.message.includes('found element missed by watcher') ||
          err.message.includes('watcher found element already found by finder')
        ) {
          return;
        }
        console.log(err, details);
      },
      tags: {
        mole: {
          ownedBy: [Tag.MoleParent],
        },
      },
      watchers: [
        {
          tag: Tag.Mole,
          selectors: [Selector.Mole],
          sources: [Tag.MoleParent],
        },
        {
          tag: Tag.MoleParent,
          selectors: [Selector.MoleParent],
          sources: [null],
        },
      ],
      finders: {
        [Tag.MoleParent]: {
          fn: (root) =>
            [root.querySelector<HTMLElement>(Selector.MoleParent)].filter(
              isNotNil,
            ),
          interval(elementCount, timeRunning) {
            return timeRunning <= 15_000 && elementCount === 0 ? 100 : 5_000;
          },
        },
        [Tag.Mole]: {
          fn: (root) => root.querySelectorAll(Selector.Mole),
          interval(elementCount, timeRunning) {
            // For initial Gmail load, we want to prevent an issue where compose moles are reordered to the left SDK moles after 5 seconds when
            //
            // - Google Chat is enabled
            // - a compose mole is open from a previous Gmail load
            // - a SDK mole is added immediately after page load.
            return timeRunning <= 5_000 && elementCount === 0 ? 100 : 5_000;
          },
        },
      },
    });

    const moleParent = this.#page.tree.getAllByTag(Tag.MoleParent);

    const moleParentLiveSet = moleParent.subscribe((changes) => {
      for (const change of changes) {
        switch (change.type) {
          case 'add': {
            const el = change.value.getValue();

            this.#moleParent = el;
            this.#moleParentReadyEvent.emit(el);

            moleParentLiveSet.unsubscribe();
          }
        }
      }
    });

    const moles = this.#page.tree.getAllByTag(Tag.Mole);

    moles.subscribe((changes) => {
      for (const change of changes) {
        switch (change.type) {
          case 'add': {
            const el = change.value.getValue();

            if (el.matches(Selector.ComposeMole)) {
              this.#maybeMoveMole(el);
            }

            break;
          }
        }
      }
    });
  }

  /**
   * This method, among other things, DOES NOT
   * - preseve initial load order with moles.
   * - preserve mole order after a mole has been maximized.
   */
  static #maybeMoveMole(mole: HTMLElement) {
    const rightSpacer = mole.parentElement?.lastElementChild;

    if (!(rightSpacer instanceof HTMLElement)) {
      return;
    }

    rightSpacer.insertAdjacentElement('beforebegin', mole);
  }

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
      className: cx(INBOXSDK_CLASS, styles.main, options.className),
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
        const lastChild = titleButtonContainer.lastElementChild;
        titleButtons.forEach((titleButton) => {
          const img = document.createElement('img');

          if (titleButton.iconClass) {
            img.className = titleButton.iconClass;
          }

          img.setAttribute('data-tooltip', titleButton.title);
          img.addEventListener('click', (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            titleButton.onClick.call(null);
          });
          if (titleButton.iconUrl) {
            img.src = titleButton.iconUrl;
          }
          titleButtonContainer.insertBefore(img, lastChild);
        });
      }
    }

    querySelector(this.#element, '.inboxsdk__mole_view_content').appendChild(
      options.el,
    );
  }

  #doShow = (moleParent: HTMLElement) => {
    const insertBefore = moleParent.lastElementChild;

    if (insertBefore instanceof HTMLElement) {
      moleParent.insertBefore(this.#element, insertBefore);
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

  show() {
    const moleParent = GmailMoleViewDriver.#moleParent;

    if (moleParent) {
      this.#doShow(moleParent);
      return;
    }

    const moleParentReadyEvent = GmailMoleViewDriver.#moleParentReadyEvent
      .takeUntilBy(this.#stopper)
      .onValue(this.#doShow);

    // The mole parent element is lazily loaded by
    // Gmail only once the user has used a compose view or a thread view.
    // If the gmail mode has settled, we've been loaded for 10 seconds, and
    // we don't have the mole parent yet, then force the mole parent to load
    // by opening a compose view and then closing it.
    Kefir.fromPromise(GmailElementGetter.waitForGmailModeToSettle())
      .flatMap(() => {
        // delay until we've passed TimestampOnReady + 5 seconds
        return this.#driver.delayToTimeAfterReady(5_000);
      })
      .takeUntilBy(moleParentReadyEvent)
      .takeUntilBy(this.#stopper)
      .onValue(async () => {
        this.#driver.getLogger().eventSdkActive('mole parent force load');

        try {
          document.body.classList.add(styles.hideComposes);
          const gmailComposeView =
            await this.#driver.openNewComposeViewDriver();
          gmailComposeView.discard();
        } finally {
          document.body.classList.remove(styles.hideComposes);
        }
      });
  }

  /**
   * If the mole is off the left edge of the screen, then move it to the
   * right.
   */
  #moveToRightmostPosition() {
    if (this.#element.getBoundingClientRect().left >= 0) {
      return;
    }

    const rightSpacer = this.#element.parentElement?.lastElementChild;

    if (!(rightSpacer instanceof HTMLElement)) {
      return;
    }

    rightSpacer.insertAdjacentElement('beforebegin', this.#element);
  }

  setMinimized(minimized: boolean) {
    if (minimized) {
      this.#element.classList.add('inboxsdk__minimized');

      this.#eventStream.emit({
        eventName: 'minimize',
      });
    } else {
      this.#element.classList.remove('inboxsdk__minimized');

      this.#moveToRightmostPosition();

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
