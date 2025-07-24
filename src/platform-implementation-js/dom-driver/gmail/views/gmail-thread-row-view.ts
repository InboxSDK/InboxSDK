import once from 'lodash/once';
import flatten from 'lodash/flatten';
import includes from 'lodash/includes';
import intersection from 'lodash/intersection';
import uniqBy from 'lodash/uniqBy';
import flatMap from 'lodash/flatMap';
import { defonce } from 'ud';
import * as Kefir from 'kefir';
import asap from 'asap';
import querySelector, {
  SelectorError,
} from '../../../lib/dom/querySelectorOrFail';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import insertElementInOrder from '../../../lib/dom/insert-element-in-order';
import kefirCast from 'kefir-cast';
import delayAsap from '../../../lib/delay-asap';
import kefirStopper from 'kefir-stopper';
import GmailDropdownView from '../widgets/gmail-dropdown-view';
import DropdownView from '../../../widgets/buttons/dropdown-view';
import GmailLabelView from '../widgets/gmail-label-view';
import GmailActionButtonView from '../widgets/gmail-action-button-view';
import type GmailDriver from '../gmail-driver';
import type GmailRowListView from './gmail-row-list-view';
import updateIcon, { IconSettings } from '../../../driver-common/update-icon';
import type {
  Contact,
  ImageDescriptor,
  LabelDescriptor,
  ThreadDateDescriptor,
} from '../../../../inboxsdk';
import { assert } from '../../../../common/assert';

type LabelMod = {
  gmailLabelView: Record<string, any>;
  remove(): void;
};
type ActionButtonMod = {
  gmailActionButtonView: GmailActionButtonView;
  remove(): void;
};
type ButtonMod = {
  buttonEl: HTMLElement;
  iconSettings: IconSettings;
  remove(): void;
};
type ImageMod = {
  iconSettings: IconSettings;
  iconWrapper: HTMLElement;
  remove(): void;
};
type ReplacedDateMod = {
  el: HTMLElement;
  remove(): void;
};
type ReplacedDraftLabelMod = ReplacedDateMod;
type Mods = {
  label: {
    unclaimed: LabelMod[];
    claimed: LabelMod[];
  };
  action: {
    unclaimed: ActionButtonMod[];
    claimed: ActionButtonMod[];
  };
  button: {
    unclaimed: ButtonMod[];
    claimed: ButtonMod[];
  };
  image: {
    unclaimed: ImageMod[];
    claimed: ImageMod[];
  };
  replacedDate: {
    unclaimed: ReplacedDateMod[];
    claimed: ReplacedDateMod[];
  };
  replacedDraftLabel: {
    unclaimed: ReplacedDraftLabelMod[];
    claimed: ReplacedDraftLabelMod[];
  };
};
const cachedModificationsByRow: WeakMap<HTMLElement, Mods> = defonce(
  module,
  () => new WeakMap(),
);

function focusAndNoPropagation(this: HTMLElement, event: Event) {
  this.focus();
  event.stopImmediatePropagation();
}

function starGroupEventInterceptor(this: HTMLElement, event: MouseEvent) {
  const isOnStar = this.firstElementChild!.contains(
    event.target as Node | null,
  );
  const isOnSDKButton = !isOnStar && this !== event.target;

  if (!isOnStar) {
    event.stopImmediatePropagation();

    if (!isOnSDKButton || event.type == 'mouseover') {
      const newEvent = document.createEvent('MouseEvents');
      newEvent.initMouseEvent(
        event.type,
        event.bubbles,
        event.cancelable,
        event.view!,
        event.detail,
        event.screenX,
        event.screenY,
        event.clientX,
        event.clientY,
        event.ctrlKey,
        event.altKey,
        event.shiftKey,
        event.metaKey,
        event.button,
        event.relatedTarget,
      );
      this.parentElement!.dispatchEvent(newEvent);
    }
  }
}

type Counts = {
  messageCount: number;
  draftCount: number;
};

class GmailThreadRowView {
  _elements: HTMLElement[];
  _modifications: Mods;
  _alreadyHadModifications: boolean;
  _rowListViewDriver: GmailRowListView;
  _driver: GmailDriver;
  _userView: Record<string, any> | null | undefined;
  _cachedThreadID: string | null | undefined;
  _cachedSyncThreadID: string | null | undefined;
  _cachedSyncDraftIDPromise:
    | Promise<string | null | undefined>
    | null
    | undefined;
  _stopper = kefirStopper();
  _refresher: Kefir.Observable<null, any> | null | undefined;
  _subjectRefresher: Kefir.Observable<null, any> | null | undefined;
  _imageRefresher: Kefir.Observable<null, any> | null | undefined;
  #counts: Counts | null = null;
  _isVertical: boolean;
  _isDestroyed: boolean = false;

  constructor(
    element: HTMLElement,
    rowListViewDriver: GmailRowListView,
    gmailDriver: GmailDriver,
  ) {
    assert(element.hasAttribute('id'), 'check element is main thread row');
    this._isVertical =
      intersection(Array.from(element.classList), ['zA', 'apv']).length === 2;

    if (this._isVertical) {
      const threadRow2 = element.nextElementSibling;
      if (!threadRow2) throw new Error('threadRow2 not found');
      const threadRow3 = threadRow2.nextElementSibling;
      const has3Rows = threadRow3 && threadRow3.classList.contains('apw');
      this._elements = has3Rows
        ? [
            element,
            (element as any).nextElementSibling,
            (element as any).nextElementSibling.nextElementSibling,
          ]
        : [element, (element as any).nextElementSibling];
    } else {
      this._elements = [element];
    }

    const modifications = cachedModificationsByRow.get(this._elements[0]);

    if (!modifications) {
      this._alreadyHadModifications = false;
      this._modifications = {
        label: {
          unclaimed: [],
          claimed: [],
        },
        action: {
          unclaimed: [],
          claimed: [],
        },
        button: {
          unclaimed: [],
          claimed: [],
        },
        image: {
          unclaimed: [],
          claimed: [],
        },
        replacedDate: {
          unclaimed: [],
          claimed: [],
        },
        replacedDraftLabel: {
          unclaimed: [],
          claimed: [],
        },
      };
      cachedModificationsByRow.set(this._elements[0], this._modifications);
    } else {
      this._modifications = modifications;
      this._alreadyHadModifications = true;
    }

    this._rowListViewDriver = rowListViewDriver;
    this._driver = gmailDriver;
    this._userView = null; // supplied by ThreadRowView

    this._cachedThreadID = null; // set in getter

    this._refresher = null;
    this._subjectRefresher = null;
    this._imageRefresher = null;

    this._elements[0].setAttribute('data-inboxsdk-thread-row', 'true');
  }

  destroy() {
    if (!this._elements.length) {
      return;
    }

    this._isDestroyed = true;
    this._modifications.label.unclaimed =
      this._modifications.label.claimed.concat(
        this._modifications.label.unclaimed,
      );
    this._modifications.label.claimed.length = 0;
    this._modifications.action.unclaimed =
      this._modifications.action.claimed.concat(
        this._modifications.action.unclaimed,
      );
    this._modifications.action.claimed.length = 0;
    this._modifications.button.unclaimed =
      this._modifications.button.claimed.concat(
        this._modifications.button.unclaimed,
      );
    this._modifications.button.claimed.length = 0;
    this._modifications.image.unclaimed =
      this._modifications.image.claimed.concat(
        this._modifications.image.unclaimed,
      );
    this._modifications.image.claimed.length = 0;
    this._modifications.replacedDate.unclaimed =
      this._modifications.replacedDate.claimed.concat(
        this._modifications.replacedDate.unclaimed,
      );
    this._modifications.replacedDate.claimed.length = 0;
    this._modifications.replacedDraftLabel.unclaimed =
      this._modifications.replacedDraftLabel.claimed.concat(
        this._modifications.replacedDraftLabel.unclaimed,
      );
    this._modifications.replacedDraftLabel.claimed.length = 0;
    flatMap(this._elements, (el) =>
      Array.from(el.getElementsByClassName('inboxsdk__thread_row_addition')),
    ).forEach((el) => {
      el.remove();
    });

    this._stopper.destroy();

    this._elements.length = 0;
  }

  getElement(): HTMLElement {
    return this._elements[0];
  }

  /**
   *  Provides the button toolbar element.
   *  Will be null when the element is not present - this happens when the "Hover actions" setting is disabled.
   */
  #getButtonToolbar(): HTMLUListElement | null {
    return (
      this._elements[0]?.querySelector<HTMLUListElement>('ul[role=toolbar]') ||
      null
    );
  }

  _removeUnclaimedModifications() {
    _removeThreadRowUnclaimedModifications(this._modifications); // TODO fix column width to deal with removed buttons
  }

  getAlreadyHadModifications(): boolean {
    return this._alreadyHadModifications;
  }

  /**
   * @returns a Kefir stream that emits this object once this object is ready for the user.
   *
   * It should almost always synchronously ready immediately, but there's
   * a few cases such as with multiple inbox or the drafts page that it needs a moment.
   * make sure you take until by on the @see GmailThreadRowView#getStopper because waitForReady
   * must not be called after the GmailThreadRowView is destroyed
   */
  waitForReady(): Kefir.Observable<GmailThreadRowView, unknown> {
    const time = [0, 10, 100, 1000, 15000];

    const step = (): Kefir.Observable<GmailThreadRowView, unknown> => {
      if (this._threadIdReady()) {
        asap(() => {
          if (this._elements.length) this._removeUnclaimedModifications();
        });
        return Kefir.constant(this);
      } else {
        const stepTime = time.shift();

        if (stepTime == undefined) {
          console.log(
            'Should not happen: ThreadRowViewDriver never became ready',
            this,
          );
          return Kefir.never();
        } else {
          return Kefir.later(stepTime, undefined).flatMap(step);
        }
      }
    };

    return step();
  }

  setUserView(userView: Record<string, any>) {
    this._userView = userView;
  }

  #getCounts(): Counts {
    if (this.#counts) {
      return this.#counts;
    }

    /**
     * If the SDK is used alongside the https://chrome.google.com/webstore/detail/mailtrack-for-gmail-inbox/ndnaehgpjlnokgebbaldlmgkapkpjkkb/utm_source/gmail/utm_medium/signature/utm_campaign/signaturevirality/th138p9fIBkLHUhniapN extension, the recipientsElement will sometimes be null.
     */
    let recipientsElement;

    try {
      recipientsElement = querySelector(this._elements[0], 'td div.yW');
    } catch (e: unknown) {
      if (e instanceof SelectorError) {
        this._driver.logger.errorSite(e);
      } else {
        throw e;
      }
    }

    if (!recipientsElement) {
      return (this.#counts = {
        messageCount: 0,
        draftCount: 0,
      });
    }

    const draftCount = recipientsElement.querySelectorAll('.boq').length;
    const messageCountMatch = recipientsElement.querySelector('.bx0');
    const messageCount = messageCountMatch?.innerHTML
      ? +messageCountMatch.innerHTML
      : draftCount
      ? 0
      : 1;
    this.#counts = {
      messageCount,
      draftCount,
    };

    return this.#counts;
  }

  _expandColumn(colSelector: string, width: number) {
    this._rowListViewDriver.expandColumn(colSelector, width);
  }

  addLabel(
    label:
      | LabelDescriptor
      | null
      | Kefir.Observable<LabelDescriptor | null, unknown>,
  ) {
    if (!this._elements.length) {
      console.warn('addLabel called on destroyed thread row');
      return;
    }

    const prop: Kefir.Observable<
      Record<string, any> | null | undefined,
      unknown
    > = kefirCast(Kefir, label).takeUntilBy(this._stopper).toProperty();
    let labelMod: LabelMod | null | undefined = null;
    prop
      .combine(this._getRefresher(), (value, _ignored) => value)
      .takeUntilBy(this._stopper)
      .onValue((labelDescriptor) => {
        if (!labelDescriptor) {
          if (labelMod) {
            labelMod.remove();

            this._modifications.label.claimed.splice(
              this._modifications.label.claimed.indexOf(labelMod),
              1,
            );

            labelMod = null;
          }
        } else {
          if (!labelMod) {
            labelMod = this._modifications.label.unclaimed.shift();

            if (!labelMod) {
              const gmailLabelView = new GmailLabelView({
                classes: ['inboxsdk__thread_row_label'],
              });
              const el = gmailLabelView.getElement();
              labelMod = {
                gmailLabelView,
                remove: el.remove.bind(el),
              };
            }

            this._modifications.label.claimed.push(labelMod);
          }

          labelMod.gmailLabelView.updateLabelDescriptor(labelDescriptor);

          const labelParentDiv = this._getLabelParent();

          if (
            labelParentDiv !==
            labelMod.gmailLabelView.getElement().parentElement
          ) {
            labelParentDiv.insertAdjacentElement(
              'afterbegin',
              labelMod.gmailLabelView.getElement(),
            );
          }
        }
      });
  }

  addImage(
    inIconDescriptor:
      | ImageDescriptor
      | Kefir.Observable<ImageDescriptor | null, any>,
  ) {
    if (!this._elements.length) {
      console.warn('addImage called on destroyed thread row');
      return;
    }

    const prop = (
      kefirCast(Kefir, inIconDescriptor) as Kefir.Observable<
        ImageDescriptor,
        unknown
      >
    )
      .toProperty()
      .combine(
        Kefir.merge([
          this._getRefresher(),
          this._getSubjectRefresher(),
          this._getImageContainerRefresher(),
        ]),
        (value, ..._ignored) => value,
      )
      .takeUntilBy(this._stopper);
    let imageMod: ImageMod | null | undefined = null;
    prop.onValue((iconDescriptor) => {
      if (!iconDescriptor) {
        if (imageMod) {
          imageMod.remove();

          this._modifications.image.claimed.splice(
            this._modifications.image.claimed.indexOf(imageMod),
            1,
          );

          imageMod = null;
        }
      } else {
        if (!imageMod) {
          imageMod = this._modifications.image.unclaimed.shift();

          if (!imageMod) {
            imageMod = {
              iconSettings: {},
              iconWrapper: document.createElement('div'),

              remove() {
                // Trigger any mouseleave handlers that were added by onHover.
                this.iconWrapper.dispatchEvent(new MouseEvent('mouseleave'));
                this.iconWrapper.remove();
              },
            };
            imageMod.iconWrapper.className =
              'inboxsdk__thread_row_icon_wrapper';
          }

          this._modifications.image.claimed.push(imageMod);
        }

        const { iconSettings, iconWrapper } = imageMod;
        updateIcon(
          iconSettings,
          iconWrapper,
          false,
          iconDescriptor.imageClass,
          iconDescriptor.imageUrl,
        );
        const containerRow =
          this._elements.length === 3 ? this._elements[2] : this._elements[0];
        containerRow.classList.add('inboxsdk__thread_row_image_added');

        if (iconDescriptor.tooltip) {
          iconWrapper.setAttribute('data-tooltip', iconDescriptor.tooltip);
        } else {
          iconWrapper.removeAttribute('data-tooltip');
        }

        if (iconDescriptor.onHover) {
          const { onHover } = iconDescriptor;
          // Using property instead of addEventListener so we replace any old handler
          // added by a previous iconDescriptor emitted from the stream.
          iconWrapper.onmouseenter = () => {
            // We only add the mouseleave listener here and use addEventListener so
            // it doesn't get replaced if a new iconDescriptor is emitted from the
            // stream while the user is hovering.
            const hoverEnd = new Promise<void>((resolve) => {
              iconWrapper.addEventListener(
                'mouseleave',
                () => {
                  resolve();
                },
                { once: true },
              );
            });
            onHover({ hoverEnd });
          };
        }

        const labelParent = this._getLabelParent();

        if (!labelParent.contains(iconWrapper)) {
          querySelector(labelParent, '.y6').insertAdjacentElement(
            'beforebegin',
            iconWrapper,
          );
        }
      }
    });
  }

  addButton(buttonDescriptor: Record<string, any>) {
    if (!this._elements.length) {
      console.warn('addButton called on destroyed thread row');
      return;
    }

    if (this._elements.length != 1) return; // buttons not supported in vertical preview pane

    let activeDropdown: any = null;
    let buttonMod: any = null;
    const prop: Kefir.Observable<
      Record<string, any> | null | undefined,
      unknown
    > = kefirCast(Kefir, buttonDescriptor)
      .toProperty()
      .takeUntilBy(this._stopper);
    prop.merge(this._stopper).onValue((buttonDescriptor) => {
      if (!buttonDescriptor) {
        if (activeDropdown) {
          activeDropdown.close();
          activeDropdown = null;
        }
      }
    });

    this._stopper.onValue(() => {
      if (buttonMod && buttonMod.buttonEl) {
        (buttonMod.buttonEl as any).onclick = null;
      }
    });

    prop
      .combine(this._getRefresher(), (value, _ignored) => value)
      .onValue((_buttonDescriptor) => {
        const buttonDescriptor = _buttonDescriptor;

        if (!buttonDescriptor) {
          if (buttonMod) {
            buttonMod.remove();

            this._modifications.button.claimed.splice(
              this._modifications.button.claimed.indexOf(buttonMod),
              1,
            );

            buttonMod = null;
          }
        } else {
          // compat workaround
          if (buttonDescriptor.className) {
            buttonDescriptor.iconClass = buttonDescriptor.className;
            delete buttonDescriptor.className;
          }

          const buttonToolbar = this.#getButtonToolbar();
          let buttonEl: HTMLElement, iconSettings;

          if (!buttonMod) {
            buttonMod = this._modifications.button.unclaimed.shift();

            if (!buttonMod) {
              if (buttonToolbar) {
                buttonEl = document.createElement('li');
                buttonEl.classList.add('bqX');
              } else {
                buttonEl = document.createElement('span');
                // T-KT is one of the class names on the star button.
                buttonEl.classList.add('T-KT');
              }
              buttonEl.classList.add('inboxsdk__thread_row_button');
              buttonEl.setAttribute('tabindex', '-1');
              buttonEl.setAttribute(
                'data-order-hint',
                String(buttonDescriptor.orderHint || 0),
              );
              buttonEl.addEventListener('onmousedown', focusAndNoPropagation);
              iconSettings = {};
              buttonMod = {
                buttonEl,
                iconSettings,
                remove: buttonEl.remove.bind(buttonEl),
              };
            }

            this._modifications.button.claimed.push(buttonMod);
          }

          iconSettings = buttonMod.iconSettings;
          buttonEl = buttonMod.buttonEl;

          // update title
          if (buttonDescriptor.title) {
            buttonEl.setAttribute('aria-label', buttonDescriptor.title);
            buttonEl.setAttribute('data-tooltip', buttonDescriptor.title);
          } else {
            buttonEl.removeAttribute('aria-label');
            buttonEl.removeAttribute('data-tooltip');
          }

          if (buttonDescriptor.onClick) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            buttonEl.onclick = (event) => {
              const appEvent = {
                dropdown: null as DropdownView | null | undefined,
                threadRowView: this._userView,
              };

              if (buttonDescriptor.hasDropdown) {
                if (activeDropdown) {
                  this._elements[0].classList.remove(
                    'inboxsdk__dropdown_active',
                  );

                  this._elements[0].classList.remove('buL'); // gmail class to force row button toolbar to be visible

                  activeDropdown.close();
                  activeDropdown = null;
                  return;
                } else {
                  this._elements[0].classList.add('inboxsdk__dropdown_active');

                  this._elements[0].classList.add('buL'); // gmail class to force row button toolbar to be visible

                  appEvent.dropdown = activeDropdown = new DropdownView(
                    new GmailDropdownView(),
                    buttonEl,
                    null,
                  );
                  activeDropdown.setPlacementOptions({
                    position: 'bottom',
                    hAlign: 'left',
                    vAlign: 'top',
                  });
                  // remember this reference before the destroy event and setTimeout
                  // because this._elements may be cleared by then.
                  const firstEl = this._elements[0];
                  activeDropdown.on('destroy', () => {
                    setTimeout(() => {
                      firstEl.classList.remove('inboxsdk__dropdown_active');
                      firstEl.classList.remove('buL'); // gmail class to force row button toolbar to be visible

                      activeDropdown = null;
                    }, 1);
                  });
                }
              }

              buttonDescriptor.onClick.call(null, appEvent);
            };
          }

          updateIcon(
            iconSettings,
            buttonEl,
            false,
            buttonDescriptor.iconClass,
            buttonDescriptor.iconUrl,
          );

          // buttonToolbar = this.#getButtonToolbar();
          // could also be trash icon
          const starGroup = buttonToolbar
            ? null
            : querySelector(this._elements[0], 'td.apU.xY, td.aqM.xY');

          if (buttonToolbar && buttonEl.parentElement !== buttonToolbar) {
            insertElementInOrder(buttonToolbar, buttonEl, undefined, true);
          } else if (starGroup && buttonEl.parentElement !== starGroup) {
            insertElementInOrder(starGroup, buttonEl);

            this._expandColumn('col.y5', 26 * starGroup.children.length);

            // Don't let the whole column count as the star for click and mouse over purposes.
            // Click events that aren't directly on the star should be stopped.
            // Mouseover events that aren't directly on the star should be stopped and
            // re-emitted from the thread row, so the thread row still has the mouseover
            // appearance.
            // Click events that are on one of our buttons should be stopped. Click events
            // that aren't on the star button or our buttons should be re-emitted from the
            // thread row so it counts as clicking on the thread.
            starGroup.onmouseover = starGroup.onclick =
              starGroupEventInterceptor as typeof starGroup.onclick;
          }
        }
      });
  }

  addActionButton(actionButtonDescriptor: Record<string, any>) {
    if (this._elements.length !== 1) {
      return;
    }

    const prop: Kefir.Observable<
      Record<string, any> | null | undefined,
      unknown
    > = kefirCast(Kefir, actionButtonDescriptor)
      .takeUntilBy(this._stopper)
      .toProperty();
    let actionMod: any = null;

    this._stopper.onEnd(() => {
      if (actionMod) {
        actionMod.gmailActionButtonView.setOnClick(null);
      }
    });

    prop.takeUntilBy(this._stopper).onValue((actionButtonDescriptor) => {
      if (actionButtonDescriptor && actionButtonDescriptor.type !== 'LINK') {
        console.error('Only type=LINK is currently supported');
        return;
      }

      if (!actionButtonDescriptor) {
        if (actionMod) {
          actionMod.remove();

          this._modifications.action.claimed.splice(
            this._modifications.action.claimed.indexOf(actionMod),
            1,
          );

          actionMod = null;
        }
      } else {
        if (!actionMod) {
          actionMod = this._modifications.action.unclaimed.shift();

          if (!actionMod) {
            const gmailActionButtonView = new GmailActionButtonView();
            const el = gmailActionButtonView.getElement();
            actionMod = {
              gmailActionButtonView,
              remove: el.remove.bind(el),
            };
          }

          this._modifications.action.claimed.push(actionMod);
        }

        actionMod.gmailActionButtonView.updateDescriptor(
          actionButtonDescriptor,
        );
        const { url, onClick } = actionButtonDescriptor;
        actionMod.gmailActionButtonView.setOnClick((event: Event) => {
          event.stopPropagation();
          window.open(url, '_blank');

          if (onClick) {
            onClick.call(null, {});
          }
        });

        const actionParentDiv =
          this._elements[0].querySelector('td.a4W .a4X .aKS') ||
          this._elements[0].querySelector('td.a4W div.xS');

        if (!actionParentDiv) throw new Error('Failed to find actionParentDiv');

        if (
          !includes(
            actionParentDiv.children,
            actionMod.gmailActionButtonView.getElement(),
          )
        ) {
          actionParentDiv.insertBefore(
            actionMod.gmailActionButtonView.getElement(),
            actionParentDiv.firstChild,
          );
        }
      }
    });
  }

  addAttachmentIcon(opts: Record<string, any>) {
    if (!this._elements.length) {
      console.warn('addAttachmentIcon called on destroyed thread row');
      return;
    }

    const getImgElement = once(() => {
      const img = document.createElement('img');
      img.src = 'images/cleardot.gif';
      return img;
    });
    const getCustomIconWrapper = once(() => {
      const div = document.createElement('div');
      return div;
    });
    var added = false;
    var currentIconUrl: string;
    var prop: Kefir.Observable<
      Record<string, any> | null | undefined,
      unknown
    > = kefirCast(Kefir, opts).toProperty();
    prop
      .combine(this._getRefresher(), (value, _ignored) => value)
      .takeUntilBy(this._stopper)
      .onValue((opts) => {
        const attachmentDiv = querySelector(this._elements[0], 'td.yf.xY');

        if (!opts) {
          if (added) {
            getCustomIconWrapper().remove();
            getImgElement().remove();
            added = false;

            if (
              !attachmentDiv.querySelector(
                '.inboxsdk__thread_row_attachment_icon',
              )
            ) {
              attachmentDiv.classList.remove(
                'inboxsdk__thread_row_attachment_icons_present',
              );
            }
          }
        } else {
          const img =
            opts.iconHtml != null ? getCustomIconWrapper() : getImgElement();

          if (opts.tooltip) {
            img.setAttribute('data-tooltip', opts.tooltip);
          } else {
            img.removeAttribute('data-tooltip');
          }

          img.className =
            opts.iconHtml != null
              ? 'inboxsdk__thread_row_addition inboxsdk__thread_row_attachment_iconWrapper ' +
                (opts.iconClass || '')
              : 'inboxsdk__thread_row_addition inboxsdk__thread_row_attachment_icon ' +
                (opts.iconClass || '');

          if (opts.iconHtml != null) {
            if (attachmentDiv.contains(getImgElement())) {
              getImgElement().remove();
            }

            img.innerHTML = opts.iconHtml;
          } else if (currentIconUrl != opts.iconUrl) {
            if (attachmentDiv.contains(getCustomIconWrapper())) {
              getCustomIconWrapper().remove();
            }

            img.style.background = opts.iconUrl
              ? 'url(' + opts.iconUrl + ') no-repeat 0 0'
              : '';
            currentIconUrl = opts.iconUrl;
          }

          if (!attachmentDiv.contains(img)) {
            attachmentDiv.appendChild(img);
            added = true;

            this._expandColumn('col.yg', attachmentDiv.children.length * 16);

            if (this._elements.length > 1) {
              this._fixDateColumnWidth();
            }
          }

          attachmentDiv.classList.add(
            'inboxsdk__thread_row_attachment_icons_present',
          );
        }
      });
  }

  _fixDateColumnWidth() {
    asap(() => {
      if (!this._elements.length) return;

      const dateContainer = this._elements[0].querySelector(
        'td.xW, td.yf > div.apm',
      );

      if (!dateContainer) return;
      const visibleDateSpan =
        dateContainer.querySelector('.inboxsdk__thread_row_custom_date') ||
        dateContainer.firstElementChild;
      if (!visibleDateSpan || !(visibleDateSpan instanceof HTMLElement)) return;

      // Attachment icons are only in the date column in vertical preivew pane.
      const dateColumnAttachmentIconCount =
        this._elements[0].querySelectorAll('td.yf > img').length;

      this._expandColumn(
        'col.xX',
        visibleDateSpan.offsetWidth +
          8 +
          2 +
          20 +
          dateColumnAttachmentIconCount * 16,
      );
    });
  }

  replaceDraftLabel(
    opts:
      | ThreadDateDescriptor
      | null
      | Kefir.Observable<ThreadDateDescriptor | null, any>,
  ) {
    if (!this._elements.length) {
      console.warn('replaceDraftLabel called on destroyed thread row');
      return;
    }

    let labelMod: any;
    let draftElement: HTMLElement, countElement: HTMLElement;
    const prop: Kefir.Observable<
      Record<string, any> | null | undefined,
      unknown
    > = kefirCast(Kefir, opts).toProperty();
    prop
      .combine(this._getRefresher(), (value, _ignored) => value)
      .takeUntilBy(this._stopper)
      .onValue((opts) => {
        const originalLabel = querySelector(this._elements[0], 'td > div.yW');
        const recipientsContainer = originalLabel.parentElement;
        if (!recipientsContainer) throw new Error('Should not happen');

        if (!opts) {
          if (labelMod) {
            labelMod.remove();

            this._modifications.replacedDraftLabel.claimed.splice(
              this._modifications.replacedDraftLabel.claimed.indexOf(labelMod),
              1,
            );

            labelMod = null;
          }
        } else {
          opts = Object.assign(
            {
              count: 1,
            },
            opts,
          );

          if (!labelMod) {
            labelMod = this._modifications.replacedDraftLabel.unclaimed.shift();

            if (!labelMod) {
              labelMod = {
                el: Object.assign(document.createElement('span'), {
                  className: 'inboxsdk__thread_row_custom_draft_label',
                }),

                remove() {
                  this.el.remove();
                },
              };
            }

            this._modifications.replacedDraftLabel.claimed.push(labelMod);
          }

          const needToAdd = !includes(
            recipientsContainer.children,
            labelMod.el,
          );

          if (needToAdd || !draftElement) {
            labelMod.el.innerHTML = originalLabel.innerHTML;
            const materiaUIlDraftElements = Array.from(
              labelMod.el.querySelectorAll('.boq'),
            );

            if (materiaUIlDraftElements.length > 0) {
              materiaUIlDraftElements.forEach((el) => (el as Element).remove());
              draftElement = Object.assign(document.createElement('span'), {
                className: 'boq',
              });
              labelMod.el.appendChild(draftElement);
            } else {
              draftElement = labelMod.el.querySelector('font');

              if (!draftElement) {
                return;
              }

              const nextSibling = draftElement.nextElementSibling;

              if (nextSibling) {
                nextSibling.remove();
              }
            }

            draftElement.classList.add(
              'inboxsdk__thread_row_custom_draft_part',
            );
            countElement = Object.assign(document.createElement('span'), {
              className: 'inboxsdk__thread_row_custom_draft_count',
            });
            labelMod.el.appendChild(countElement);
          }

          draftElement.textContent = opts.text;
          countElement.textContent = opts.count !== 1 ? ` (${opts.count})` : '';

          if (needToAdd) {
            recipientsContainer.insertBefore(labelMod.el, originalLabel);
          }
        }
      });
  }

  replaceDate(
    opts:
      | ThreadDateDescriptor
      | null
      | Kefir.Observable<ThreadDateDescriptor | null, any>,
  ) {
    if (!this._elements.length) {
      console.warn('replaceDate called on destroyed thread row');
      return;
    }

    let dateMod: any;
    const prop: Kefir.Observable<
      Record<string, any> | null | undefined,
      unknown
    > = kefirCast(Kefir, opts).toProperty();
    prop
      .combine(this._getRefresher(), (value, _ignored) => value)
      .takeUntilBy(this._stopper)
      .onValue((opts) => {
        const dateContainer = querySelector(
          this._elements[0],
          'td.xW, td.yf > div.apm',
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const originalDateSpan = dateContainer.firstElementChild;

        if (!opts) {
          if (dateMod) {
            dateMod.remove();

            this._modifications.replacedDate.claimed.splice(
              this._modifications.replacedDate.claimed.indexOf(dateMod),
              1,
            );

            dateMod = null;
          }
        } else {
          if (!dateMod) {
            dateMod = this._modifications.replacedDate.unclaimed.shift();

            if (!dateMod) {
              dateMod = {
                el: Object.assign(document.createElement('span'), {
                  className: 'inboxsdk__thread_row_custom_date',
                }),

                remove() {
                  this.el.remove();
                  dateContainer.classList.remove(
                    'inboxsdk__thread_row_custom_date_container',
                  );
                },
              };
            }

            this._modifications.replacedDate.claimed.push(dateMod);
          }

          dateMod.el.textContent = opts.text;

          if (opts.tooltip) {
            dateMod.el.setAttribute('data-tooltip', opts.tooltip);
            dateMod.el.setAttribute('aria-label', opts.tooltip);
          } else {
            dateMod.el.removeAttribute('data-tooltip');
            dateMod.el.removeAttribute('aria-label');
          }

          dateMod.el.style.color = opts.textColor || '';

          if (!includes(dateContainer.children, dateMod.el)) {
            dateContainer.insertBefore(dateMod.el, dateContainer.firstChild);
            dateContainer.classList.add(
              'inboxsdk__thread_row_custom_date_container',
            );
          }

          this._fixDateColumnWidth();
        }
      });
  }

  getEventStream() {
    return this._stopper;
  }

  getStopper() {
    return this._stopper;
  }

  getSubject(): string {
    return this._getSubjectSelector().textContent!;
  }

  _getSubjectSelector(): HTMLElement {
    return this._elements.length > 1
      ? querySelector(this._elements[1], 'div.xS div.xT div.y6 > span[id]')
      : querySelector(
          this._elements[0],
          'td.a4W div.xS div.xT div.y6 > span[id]',
        );
  }

  replaceSubject(newSubjectStr: string) {
    const subjectEleSelector = this._getSubjectSelector();

    if (subjectEleSelector) {
      subjectEleSelector.textContent = newSubjectStr;
    }
  }

  getDateString(): string {
    return querySelector(
      this._elements[0],
      'td.xW > span[title]:not(.inboxsdk__thread_row_custom_date), td.yf.apt > div.apm > span[title]:not(.inboxsdk__thread_row_custom_date)',
    ).title;
  }

  _threadIdReady(): boolean {
    return !!this._getThreadID();
  }

  _getThreadID(): string | null | undefined {
    if (this._cachedThreadID) {
      return this._cachedThreadID;
    }

    const elementWithId = flatten(
      this._elements.map((el) =>
        Array.from(
          el.querySelectorAll('[data-thread-id][data-legacy-thread-id]'),
        ),
      ),
    ).filter(Boolean)[0];

    if (elementWithId) {
      this._cachedSyncThreadID = elementWithId
        .getAttribute('data-thread-id')!
        .replace('#', '');
      this._cachedThreadID = elementWithId
        .getAttribute('data-legacy-thread-id')!
        .replace('#', '');
      return this._cachedThreadID;
    } else {
      const threadID = this._driver
        .getThreadRowIdentifier()
        .getThreadIdForThreadRow(this, this._elements);

      this._cachedSyncThreadID = threadID;

      if (threadID) {
        this._driver
          .getOldGmailThreadIdFromSyncThreadId(threadID)
          .then((oldGmailThreadID) => {
            this._cachedThreadID = oldGmailThreadID;
          });
      }
    }

    return this._cachedThreadID;
  }

  getThreadID(): string {
    const threadID = this._getThreadID();

    if (!threadID) {
      throw new Error('Should not happen: thread id was null');
    }

    return threadID;
  }

  /**
   * This method is never called in the view proper.
   * GmailThreadRowView#getThreadIDAsync is called though.
   */
  getSyncThreadID(): Promise<string | null | undefined> {
    return Promise.resolve(this._cachedSyncThreadID);
  }

  async getThreadIDAsync(): Promise<string> {
    return this.getThreadID();
  }

  getDraftID(): Promise<string | null | undefined> {
    if (this._cachedSyncDraftIDPromise) return this._cachedSyncDraftIDPromise;

    const elementWithId = flatten(
      this._elements.map((el) =>
        Array.from(el.querySelectorAll('[data-standalone-draft-id]')),
      ),
    ).filter(Boolean)[0];
    this._cachedSyncDraftIDPromise = Promise.resolve(
      elementWithId
        ? elementWithId
            .getAttribute('data-standalone-draft-id')!
            .replace('#msg-a:', '')
        : null,
    );

    return this._cachedSyncDraftIDPromise;
  }

  getVisibleDraftCount(): number {
    return this.#getCounts().draftCount;
  }

  getVisibleMessageCount(): number {
    return this.#getCounts().messageCount;
  }

  getContacts(): Contact[] {
    const senderSpans = this._elements[0].querySelectorAll('[email]');

    const contacts = Array.from(senderSpans).map((span) => ({
      emailAddress: span.getAttribute('email')!,
      name: span.getAttribute('name')!,
    }));
    return uniqBy(contacts, (contact) => contact.emailAddress);
  }

  isSelected(): boolean {
    return !!this._elements[0].querySelector(
      'div[role=checkbox][aria-checked=true]',
    );
  }

  _getLabelParent(): HTMLElement {
    return this._elements.length > 1
      ? querySelector(
          this._elements[this._elements.length === 2 ? 0 : 2],
          'div.apu',
        )
      : querySelector(this._elements[0], 'td.a4W div.xS div.xT');
  }

  _getWatchElement(): HTMLElement {
    return this._elements.length === 1
      ? this._elements[0]
      : (this._elements[0].children[2] as HTMLElement);
  }

  _getRefresher() {
    // Stream that emits an event after whenever Gmail replaces the ThreadRow DOM
    // nodes. One time this happens is when you have a new email in your inbox,
    // you read the email, return to the inbox, get another email, and then the
    // first email becomes re-rendered.
    // Important: This stream is only listened on if some modifier method
    // (like addLabel) is called. If none of those methods are called, then the
    // stream is not listened on and no MutationObserver ever gets made, saving
    // us a little bit of work.
    let refresher = this._refresher;

    if (!refresher) {
      refresher = this._refresher = makeMutationObserverChunkedStream(
        this._getWatchElement(),
        {
          childList: true,
        },
      )
        .map(() => null)
        .takeUntilBy(this._stopper)
        .toProperty(() => null);
    }

    return refresher;
  }

  _getSubjectRefresher(): Kefir.Observable<null, unknown> {
    // emit an event whenever the subject element is swapped out for a new one.
    let subjectRefresher = this._subjectRefresher;

    if (!subjectRefresher) {
      if (this._isVertical) {
        subjectRefresher = this._subjectRefresher = Kefir.constant(null);
      } else {
        const watchElement = this._getWatchElement();

        const subjectElement = querySelector(watchElement, '.y6');
        subjectRefresher = this._subjectRefresher =
          makeMutationObserverChunkedStream(subjectElement, {
            childList: true,
          })
            .map(() => null)
            .takeUntilBy(this._stopper)
            .toProperty(() => null);
      }
    }

    return subjectRefresher;
  }

  _getImageContainerRefresher(): Kefir.Observable<null, unknown> {
    let imageRefresher = this._imageRefresher;

    if (!imageRefresher) {
      if (this._isVertical) {
        const containerRow =
          this._elements.length === 3 ? this._elements[2] : this._elements[0];
        const classChangeStream = makeMutationObserverChunkedStream(
          containerRow,
          {
            attributes: true,
            attributeFilter: ['class'],
          },
        );
        imageRefresher = this._imageRefresher = classChangeStream
          .bufferBy(classChangeStream.flatMapLatest(() => delayAsap()))
          .filter(
            () =>
              containerRow.querySelectorAll(
                '.inboxsdk__thread_row_icon_wrapper',
              ).length > 0 &&
              !containerRow.classList.contains(
                'inboxsdk__thread_row_image_added',
              ),
          )
          .map(() => null)
          .takeUntilBy(this._stopper)
          .toProperty(() => null);
      } else {
        imageRefresher = this._imageRefresher = Kefir.constant(null);
      }
    }

    return imageRefresher;
  }
}

export default GmailThreadRowView;
export function removeAllThreadRowUnclaimedModifications() {
  // run in a setTimeout so that the thread rows get destroyed
  // and populate the unclaimed modifications
  setTimeout(() => {
    const modifiedRows = document.querySelectorAll(
      'tr[data-inboxsdk-thread-row]',
    );
    Array.prototype.forEach.call(modifiedRows, (row) => {
      const modifications = cachedModificationsByRow.get(row);

      if (modifications) {
        _removeThreadRowUnclaimedModifications(modifications);
      }
    });
  }, 15);
}

function _removeThreadRowUnclaimedModifications(modifications: Mods) {
  for (let ii = 0; ii < modifications.label.unclaimed.length; ii++) {
    const mod = modifications.label.unclaimed[ii];
    //console.log('removing unclaimed label mod', mod);
    mod.remove();
  }

  modifications.label.unclaimed.length = 0;

  for (let ii = 0; ii < modifications.button.unclaimed.length; ii++) {
    const mod = modifications.button.unclaimed[ii];
    //console.log('removing unclaimed button mod', mod);
    mod.remove();
  }

  modifications.button.unclaimed.length = 0;

  for (let ii = 0; ii < modifications.image.unclaimed.length; ii++) {
    const mod = modifications.image.unclaimed[ii];
    //console.log('removing unclaimed image mod', mod);
    mod.remove();
  }

  modifications.image.unclaimed.length = 0;

  for (let ii = 0; ii < modifications.replacedDate.unclaimed.length; ii++) {
    const mod = modifications.replacedDate.unclaimed[ii];
    //console.log('removing unclaimed replacedDate mod', mod);
    mod.remove();
  }

  modifications.replacedDate.unclaimed.length = 0;

  for (
    let ii = 0;
    ii < modifications.replacedDraftLabel.unclaimed.length;
    ii++
  ) {
    const mod = modifications.replacedDraftLabel.unclaimed[ii];
    mod.remove();
  }

  modifications.replacedDraftLabel.unclaimed.length = 0;
}
