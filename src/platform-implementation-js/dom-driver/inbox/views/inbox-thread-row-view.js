/* @flow */

import {defn} from 'ud';
import updateIcon from '../../../driver-common/update-icon';
import autoHtml from 'auto-html';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import kefirStopper from 'kefir-stopper';
import kefirCast from 'kefir-cast';
import BigNumber from 'bignumber.js';
import delayAsap from '../../../lib/delay-asap';
import idMap from '../../../lib/idMap';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import InboxLabelView from './InboxLabelView';

import type InboxDriver from '../inbox-driver';
import type {Parsed} from '../detection/thread-row/parser';

class InboxThreadRowView {
  _element: HTMLElement;
  _driver: InboxDriver;
  _p: Parsed;
  _userView: ?Object;
  _eventStream: Bus<any> = kefirBus();
  _stopper: Kefir.Observable<null>;
  _isDestroyed: boolean = false;

  constructor(element: HTMLElement, driver: InboxDriver, parsed: Parsed) {
    this._element = element;
    this._driver = driver;
    this._p = parsed;

    this._stopper = this._eventStream.ignoreValues().beforeEnd(()=>null).toProperty();
  }

  getEventStream(): Kefir.Observable<any> {
    return this._eventStream;
  }

  getStopper(): Kefir.Observable<null> {
    return this._stopper;
  }

  // keeping this here for now since the rest of the system expects it.
  // in Gmail it's used to pass a ThreadRowView interface to addButton()
  // onClick callbacks, but not sure if it will be needed in the end.
  setUserView(userView: Object) {
    this._userView = userView;
  }

  isSelected(): boolean {
    if (!this._p.elements.checkbox) {
      throw new Error('Did not find checkbox element');
    }
    return this._p.elements.checkbox.getAttribute('aria-checked') === 'true';
  }

  addAttachmentIcon(options: Object) {
    throw new Error('Not supported in Inbox');
  }

  addButton(options: Object) {
    throw new Error('Not supported in Inbox');
  }

  addActionButton(options: Object) {
    throw new Error('not yet implemented');
  }

  addImage(icon: Object) {
    if (this._isDestroyed) {
      console.warn('addImage called on destroyed thread row'); //eslint-disable-line no-console
      return;
    }

    const {labelParent} = this._p.elements;
    if (!labelParent) throw new Error('Could not find label parent element');

    const prop = kefirCast((Kefir: any), icon)
      .takeUntilBy(this._stopper)
      .toProperty();

    let imageMod = null;

    prop.onValue((iconDescriptor) => {
      if (!iconDescriptor) {
        if (imageMod) {
          imageMod.remove();
          imageMod = null;
        }
      } else {
        if (!imageMod) {
          imageMod = {
            iconSettings: {},
            iconWrapper: document.createElement('div'),
            remove() {
              this.iconWrapper.remove();
            }
          };
          imageMod.iconWrapper.className = 'inboxsdk__thread_row_icon_wrapper';
        }
        const {iconSettings, iconWrapper} = imageMod;

        updateIcon(
          iconSettings,
          iconWrapper,
          false,
          iconDescriptor.imageClass,
          iconDescriptor.imageUrl
        );

        if (iconDescriptor.tooltip) {
          iconWrapper.setAttribute('title', iconDescriptor.tooltip);
        }

        if (labelParent !== iconWrapper.parentElement) {
          const threadLabels = labelParent.querySelectorAll('.inboxsdk__inbox_thread_row_label');
          const insertionPoint = threadLabels.length > 0 ?
                                threadLabels[threadLabels.length - 1].nextElementSibling :
                                labelParent.firstChild;

          labelParent.insertBefore(iconWrapper, insertionPoint);
        }
      }
    });

    this._stopper.onEnd(() => {
      if (imageMod) {
        imageMod.remove();
      }
    });
  }

  addLabel(label: Object) {
    if (this._isDestroyed) {
      console.warn('addLabel called on destroyed thread row'); //eslint-disable-line no-console
      return;
    }

    const labelParentDiv = this._p.elements.labelParent;
    if (!labelParentDiv) throw new Error('Could not find label parent element');

    const prop: Kefir.Observable<?Object> = kefirCast(Kefir, label).takeUntilBy(this._stopper).toProperty();
    let labelMod = null;

    prop.onValue((labelDescriptor) => {
      if(!labelDescriptor){
        if (labelMod) {
          labelMod.remove();
          labelMod = null;
        }
      } else {
        if (!labelMod) {
          const inboxLabelView = new InboxLabelView();
          const el = inboxLabelView.getElement();
          labelMod = {
            inboxLabelView,
            remove: el.remove.bind(el)
          };
        }

        labelMod.inboxLabelView.updateLabelDescriptor(labelDescriptor);

        if (labelParentDiv !== labelMod.inboxLabelView.getElement().parentElement) {
          const threadLabels = labelParentDiv.querySelectorAll('.inboxsdk__inbox_thread_row_label');
          const insertionPoint = threadLabels.length > 0 ?
                                threadLabels[threadLabels.length - 1].nextElementSibling :
                                labelParentDiv.firstChild;

          labelParentDiv.insertBefore(
            labelMod.inboxLabelView.getElement(),
            insertionPoint
          );
        }
      }
    });

    this._stopper.onEnd(() => {
      if (labelMod) {
        labelMod.remove();
      }
    });
  }

  getDateString() {
    throw new Error('Not supported in Inbox');
  }

  getSubject(): string {
    if (!this._p.elements.subject) {
      throw new Error('Failed to find subject');
    }
    return this._p.elements.subject.textContent;
  }

  getThreadID() {
    throw new Error('Not supported in Inbox. Please use getThreadIDAsync() instead');
  }

  async getThreadIDAsync(): Promise<string> {
    const {inboxThreadId} = this._p.attributes;
    if (!inboxThreadId) {
      throw new Error('Failed to find thread id');
    }
    if (/^thread-a:/.test(inboxThreadId)) {
      // Get the inbox message id of any message in the thread, convert it to
      // a gmail message id, and then use that id in a request
      // to a gmail endpoint to get the id of the thread that message is in.
      const inboxMessageId = await this._driver.getInboxMessageIdForInboxThreadId(inboxThreadId);
      const gmailMessageId = await this._driver.getGmailMessageIdForInboxMessageId(inboxMessageId);

      return await this._driver.getThreadIdFromMessageId(gmailMessageId);
    } else {
      const m = /\d+$/.exec(inboxThreadId);
      if (!m) throw new Error('Should not happen');
      return new BigNumber(m[0]).toString(16);
    }
  }

  async getDraftID(): Promise<?string> {
    const {isOnlyDraft, inboxThreadId} = this._p.attributes;

    if (isOnlyDraft && inboxThreadId) {
      const m = /\d+$/.exec(inboxThreadId);
      if (!m) throw new Error('Should not happen');
      return m[0];
    } else {
      return null;
    }
  }

  getVisibleDraftCount(): number {
    const {visibleDraftCount} = this._p.attributes;
    if (typeof visibleDraftCount !== 'number') throw new Error('Failed to find visible draft count');
    return visibleDraftCount;
  }

  getVisibleMessageCount(): number {
    const {visibleMessageCount} = this._p.attributes;
    if (typeof visibleMessageCount !== 'number') throw new Error('Failed to find visible message count');
    return visibleMessageCount;
  }

  getContacts(): Contact[] {
    const {contacts} = this._p.attributes;
    if (!Array.isArray(contacts)) throw new Error('Failed to find contacts');
    return contacts;
  }

  replaceDate(options: Object) {
    throw new Error('Not supported in Inbox');
  }

  replaceDraftLabel(label: Object) {
    if (this._isDestroyed) {
      console.warn('addLabel called on destroyed thread row'); //eslint-disable-line no-console
      return;
    }

    // We don't want to replace draft labels on messages without drafts
    if (this._p.attributes.visibleDraftCount === 0) return;

    const {recipientParent, messageCountParent} = this._p.elements;
    if (!recipientParent || !messageCountParent) throw new Error('Could not find necessary parent elements');

    const prop: Kefir.Observable<?Object> = kefirCast(Kefir, label).takeUntilBy(this._stopper).toProperty();
    let labelMod = null;

    prop.onValue((labelDescriptor) => {
      if(!labelDescriptor){
        if (labelMod) {
          labelMod.remove();
          labelMod = null;
        }
      } else {
        const {text, count} = labelDescriptor;
        if (!labelMod) {
          labelMod = {
            countEl: document.createElement('span'),
            draftEl: document.createElement('span'),
            remove() {
              this.countEl.remove();
              this.draftEl.remove();

              recipientParent.classList.remove('inboxsdk__thread_row_draft_label_replaced');
              messageCountParent.classList.remove('inboxsdk__thread_row_draft_count_replaced');

              if (!messageCountParent.querySelector('span:not(.inboxsdk__thread_row_custom_draft_count)')) {
                ((messageCountParent: any): HTMLElement).style.display = 'none';
              }
            }
          };

          labelMod.draftEl.className = 'inboxsdk__thread_row_custom_draft_label';
          labelMod.countEl.className = 'inboxsdk__thread_row_custom_draft_count';

          recipientParent.classList.add('inboxsdk__thread_row_draft_label_replaced');
        }

        labelMod.draftEl.textContent = text;

        if (recipientParent !== labelMod.draftEl.parentElement) {
          recipientParent.appendChild(labelMod.draftEl);
        }

        const hasExistingCountEl = messageCountParent.querySelector('span:not(.inboxsdk__thread_row_custom_draft_count)');

        if (count && count > 1) {
          messageCountParent.classList.add('inboxsdk__thread_row_draft_count_replaced');
          ((messageCountParent: any): HTMLElement).style.display = 'inline';

          labelMod.countEl.innerHTML = hasExistingCountEl ? autoHtml `(${count})` : autoHtml `&nbsp;(${count})`;

          if (messageCountParent !== labelMod.countEl.parentElement) {
            messageCountParent.appendChild(labelMod.countEl);
          }
        } else {
          messageCountParent.classList.remove('inboxsdk__thread_row_draft_count_replaced');
          if (!hasExistingCountEl) {
            ((messageCountParent: any): HTMLElement).style.display = 'none';
          }
          labelMod.countEl.remove();
        }
      }
    });
  }

  destroy() {
    this._isDestroyed = true;
    this._eventStream.end();
  }
}

export default defn(module, InboxThreadRowView);
