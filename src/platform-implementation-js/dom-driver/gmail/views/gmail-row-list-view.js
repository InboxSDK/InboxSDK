/* @flow */

import { defn } from 'ud';
import find from 'lodash/find';
import zip from 'lodash/zip';
import asap from 'asap';
import assert from 'assert';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type { Bus } from 'kefir-bus';
import get from '../../../../common/get-or-fail';
import delayAsap from '../../../lib/delay-asap';
import querySelector from '../../../lib/dom/querySelectorOrFail';

import GmailToolbarView from './gmail-toolbar-view';
import GmailThreadRowView from './gmail-thread-row-view';

import streamWaitFor from '../../../lib/stream-wait-for';
import type { ElementWithLifetime } from '../../../lib/dom/make-element-child-stream';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import makeElementViewStream from '../../../lib/dom/make-element-view-stream';

import type GmailDriver from '../gmail-driver';
import type GmailRouteView from './gmail-route-view/gmail-route-view';

const THREAD_ROW_SELECTED_CLASSNAME = 'x7';
const THREAD_ROW_SELECTED_CLASSNAME_REGEX = /\bx7\b/;

class GmailRowListView {
  _element: HTMLElement;
  _gmailDriver: GmailDriver;
  _routeViewDriver: GmailRouteView;
  _pendingExpansions: Map<string, number>;
  _pendingExpansionsSignal: Bus<any>;
  _toolbarView: ?GmailToolbarView;
  _threadRowViewDrivers: Set<GmailThreadRowView> = new Set();
  _eventStreamBus: Bus<any>;
  _rowViewDriverStream: Kefir.Observable<GmailThreadRowView>;
  _stopper: Kefir.Observable<any>;
  _elementsToViews: Map<HTMLElement, GmailThreadRowView> = new Map();
  _selectionMutationObserver: MutationObserver;
  _selectedThreadRowViews: Set<GmailThreadRowView> = new Set();

  constructor(
    rootElement: HTMLElement,
    routeViewDriver: GmailRouteView,
    gmailDriver: GmailDriver
  ) {
    this._eventStreamBus = kefirBus();
    this._stopper = this._eventStreamBus.ignoreValues().beforeEnd(() => null);
    this._gmailDriver = gmailDriver;

    this._element = rootElement;
    this._routeViewDriver = routeViewDriver;

    this._selectionMutationObserver = new MutationObserver(mutations => {
      let changed = false;
      for (let i = 0, len = mutations.length; i < len; i++) {
        const mutation = mutations[i];
        const target: any = mutation.target;
        const wasSelected = THREAD_ROW_SELECTED_CLASSNAME_REGEX.test(
          (mutation: any).oldValue
        );
        const isSelected = THREAD_ROW_SELECTED_CLASSNAME_REGEX.test(
          target.className
        );
        if (wasSelected !== isSelected) {
          const view = this._elementsToViews.get(target);
          if (view) {
            // we could be processing an element that was already removed
            changed = true;
            if (isSelected) {
              this._selectedThreadRowViews.add(view);
            } else {
              this._selectedThreadRowViews.delete(view);
            }
          }
        }
      }
      if (changed) {
        this._gmailDriver.signalThreadRowViewSelectionChange();
      }
    });

    this._pendingExpansions = new Map();
    this._pendingExpansionsSignal = kefirBus();
    this._pendingExpansionsSignal
      .bufferBy(this._pendingExpansionsSignal.flatMap(delayAsap))
      .filter(x => x.length > 0)
      .takeUntilBy(this._stopper)
      .onValue(this._expandColumnJob.bind(this));

    this._setupToolbarView();
    this._startWatchingForRowViews();
  }

  destroy() {
    this._selectionMutationObserver.disconnect();
    this._threadRowViewDrivers.forEach(threadRow => threadRow.destroy());
    this._eventStreamBus.end();
    if (this._toolbarView) {
      this._toolbarView.destroy();
    }
    if (this._selectedThreadRowViews.size) {
      this._selectedThreadRowViews.clear();
      this._gmailDriver.signalThreadRowViewSelectionChange();
    }
  }

  getElement(): HTMLElement {
    return this._element;
  }

  getRouteViewDriver(): GmailRouteView {
    return this._routeViewDriver;
  }

  getToolbarView(): ?GmailToolbarView {
    return this._toolbarView;
  }

  getSelectedThreadRowViewDrivers(): Set<GmailThreadRowView> {
    return this._selectedThreadRowViews;
  }

  getThreadRowViewDrivers(): Set<GmailThreadRowView> {
    return this._threadRowViewDrivers;
  }

  getRowViewDriverStream(): Kefir.Observable<GmailThreadRowView> {
    return this._rowViewDriverStream;
  }

  getEventStream(): Kefir.Observable<any> {
    return this._eventStreamBus;
  }

  _setupToolbarView() {
    var toolbarElement = this._findToolbarElement();

    if (toolbarElement) {
      this._toolbarView = new GmailToolbarView(
        toolbarElement,
        this._gmailDriver,
        this._routeViewDriver,
        this
      );
    } else {
      this._toolbarView = null;
    }
  }

  _findToolbarElement() {
    /* multiple inbox extra section */
    const firstTry = this._element.querySelector('[gh=mtb]');
    if (firstTry) {
      return firstTry;
    }
    const el = find(
      document.querySelectorAll('[gh=tm]'),
      toolbarContainerElement =>
        toolbarContainerElement.parentElement.parentElement ===
          (this._element: any).parentElement.parentElement.parentElement
            .parentElement.parentElement ||
        toolbarContainerElement.parentElement.parentElement ===
          this._element.parentElement
    );
    return el ? el.querySelector('[gh=mtb]') : null;
  }

  // When a new table is added to a row list, if an existing table has had its
  // column widths modified (by GmailThreadRowView), then the new table needs to
  // match.
  _fixColumnWidths(newTableParent: ?HTMLElement) {
    if (!newTableParent || !newTableParent.parentElement) {
      return;
    }

    const firstTableParent = newTableParent.parentElement.firstElementChild;
    if (firstTableParent !== newTableParent && firstTableParent) {
      const firstCols = firstTableParent.querySelectorAll(
        'table.cf > colgroup > col'
      );
      const newCols = newTableParent.querySelectorAll(
        'table.cf > colgroup > col'
      );
      assert.strictEqual(firstCols.length, newCols.length);
      zip(firstCols, newCols).forEach(([firstCol, newCol]) => {
        newCol.style.width = firstCol.style.width;
      });
    }
  }

  expandColumn(colSelector: string, width: number) {
    const pendingWidth = this._pendingExpansions.get(colSelector);
    if (!pendingWidth || width > pendingWidth) {
      this._pendingExpansions.set(colSelector, width);
      this._pendingExpansionsSignal.emit();
    }
  }

  _expandColumnJob() {
    this._pendingExpansions.forEach((width, colSelector) => {
      Array.prototype.forEach.call(
        this._element.querySelectorAll('table.cf > colgroup > ' + colSelector),
        col => {
          const currentWidth = parseInt(col.style.width, 10);
          if (isNaN(currentWidth) || currentWidth < width) {
            col.style.width = width + 'px';
          }
        }
      );
    });
    this._pendingExpansions.clear();
  }

  _batchedSignalThreadRowViewSelectionChangeScheduled = false;
  _batchedSignalThreadRowViewSelectionChange() {
    if (this._batchedSignalThreadRowViewSelectionChangeScheduled) {
      return;
    }
    this._batchedSignalThreadRowViewSelectionChangeScheduled = true;
    delayAsap(null)
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._batchedSignalThreadRowViewSelectionChangeScheduled = false;
        this._gmailDriver.signalThreadRowViewSelectionChange();
      });
  }

  _startWatchingForRowViews() {
    const tableDivParents = Array.from(
      this._element.querySelectorAll('div.Cp')
    );

    const elementStream: Kefir.Observable<ElementWithLifetime> = Kefir.merge(
      tableDivParents.map(makeElementChildStream)
    ).flatMap(event => {
      this._fixColumnWidths(event.el);
      const tbody = querySelector(event.el, 'table > tbody');

      // In vertical preview pane mode, each thread row has three <tr>
      // elements. We just want to pass the first one (which has an id) to
      // GmailThreadRowView().
      return makeElementChildStream(tbody)
        .takeUntilBy(event.removalStream)
        .filter(rowEvent => rowEvent.el.id);
    });

    const laterStream = Kefir.later(2);

    this._rowViewDriverStream = elementStream
      .map(event => {
        const element = event.el;
        this._selectionMutationObserver.observe(element, {
          attributes: true,
          attributeFilter: ['class'],
          attributeOldValue: true
        });

        const view = new GmailThreadRowView(element, this, this._gmailDriver);
        this._elementsToViews.set(element, view);
        if (element.classList.contains(THREAD_ROW_SELECTED_CLASSNAME)) {
          this._selectedThreadRowViews.add(view);
          this._batchedSignalThreadRowViewSelectionChange();
        }
        event.removalStream.take(1).onValue(() => {
          if (this._selectedThreadRowViews.has(view)) {
            this._selectedThreadRowViews.delete(view);
            this._batchedSignalThreadRowViewSelectionChange();
          }
          this._elementsToViews.delete(element);
          view.destroy();
        });
        return view;
      })
      .flatMap(threadRowView => {
        if (threadRowView.getAlreadyHadModifications()) {
          // Performance hack: If the row already has old modifications on it, wait
          // a moment before we re-emit the thread row and process our new
          // modifications.

          return laterStream
            .flatMap(() => threadRowView.waitForReady())
            .takeUntilBy(threadRowView.getStopper());
        } else {
          return threadRowView
            .waitForReady()
            .takeUntilBy(threadRowView.getStopper());
        }
      })
      .takeUntilBy(this._stopper);

    this._rowViewDriverStream.onValue(x => this._addThreadRowView(x));
  }

  _addThreadRowView(gmailThreadRowView: GmailThreadRowView) {
    this._threadRowViewDrivers.add(gmailThreadRowView);

    gmailThreadRowView
      .getStopper()
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._threadRowViewDrivers.delete(gmailThreadRowView);
      });
  }
}

export default defn(module, GmailRowListView);
