/* @flow */

import {defn} from 'ud';
import find from 'lodash/find';
import React from 'react';
import ReactDOM from 'react-dom';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import type {MoleViewDriver, MoleOptions} from '../../../driver-interfaces/mole-view-driver';
import kefirBus from 'kefir-bus';

class InboxMoleViewDriver {
  _options: MoleOptions;
  _stopper = kefirStopper();
  _eventStream = kefirBus();
  _element: HTMLElement;
  _title: string;

  constructor(options: MoleOptions) {
    (this: MoleViewDriver);
    this._options = options;
    this._element = document.createElement('div');
    this._element.className = 'inboxsdk__mole_view '+(options.className||'');
    this._element.setAttribute('jsaction', 'global.none');

    this._title = this._options.title || '';

    this._render();
    (this._element.firstElementChild:any).style.zIndex = '1';
  }
  _render() {
    ReactDOM.render(
      <MoleViewContents
        title={this._title}
        el={this._options.el}
      />,
      this._element
    );
  }
  show() {
    if (this._element.parentElement) {
      throw new Error('show was called twice');
    }
    const container = document.getElementById('OPOhoe');
    if (!container) throw new Error('could not insert moleview');
    container.insertBefore(this._element, container.firstElementChild);
    this._setupWidth();

    // Keep the mole as the first item in the list
    makeMutationObserverChunkedStream(container, {childList: true})
      .takeUntilBy(this._stopper)
      .onValue(muts => {
        const composeWasAdded = muts.some(mutation =>
          Array.prototype.some.call(mutation.addedNodes, node =>
            node.nodeType === 1 && !node.classList.contains('inboxsdk__mole_view')
          )
        );

        if (composeWasAdded) {
          container.insertBefore(this._element, container.firstElementChild);
        }
        this._setupWidth();
      });
    makeMutationObserverChunkedStream(this._options.el, {attributes: true, attributeFilter: ['class', 'style']})
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._setupWidth();
      });
    Kefir.fromEvents(this._element, 'click')
      .merge(fromEventTargetCapture(this._element, 'focus'))
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this._bringToFront();
      });
  }
  _setupWidth() {
    const naturalWidth = querySelector(this._element, '.inboxsdk__mole_view_inner').getBoundingClientRect().width;
    this._element.style.width = naturalWidth+'px';
  }
  _bringToFront() {
    const container = this._element.parentElement;
    if (!container) throw new Error('mole not in document');
    const selfIndex = Array.prototype.indexOf.call(container.children, this._element);
    if (selfIndex < 0) throw new Error('should not happen');
    const count = container.children.length;

    const firstComposeParent = find(container.children, isComposeParentElement);

    const changeId = String((Number(container.getAttribute('data-change-id') || 0)+1)%Number.MAX_SAFE_INTEGER);
    container.setAttribute('data-change-id', changeId);

    if (firstComposeParent) {
      // emit a fake focus event so Inbox puts this (the right-most) composeview on top
      firstComposeParent.dispatchEvent(new FocusEvent('focus'));
    }

    Array.prototype.forEach.call(container.children, (child, i) => {
      if (isComposeParentElement(child)) return;
      const zIndexedChild = find(child.children, child => child.style.zIndex);
      if (!zIndexedChild) return;
      zIndexedChild.style.zIndex = String(i > selfIndex ? count-(i-selfIndex) : count);
    });

    Kefir.merge([
      !firstComposeParent ? null : fromEventTargetCapture(firstComposeParent, 'focus')
    ].concat(Array.prototype.map.call(container.children, el => {
      // if (!isComposeParentElement(el)) return null;
      const zIndexedChild = find(el.children, child => child.style.zIndex);
      if (!zIndexedChild) return null;
      const currentZindex = zIndexedChild.style.zIndex;
      return makeMutationObserverChunkedStream(zIndexedChild, {attributes: true, attributeFilter: ['style']})
        .filter(() => zIndexedChild.style.zIndex !== currentZindex);
    })).filter(Boolean))
      .takeUntilBy(this._stopper)
      .take(1)
      .onValue(() => {
        if (container.getAttribute('data-change-id') === changeId) {
          container.removeAttribute('data-change-id');
          Array.prototype.forEach.call(container.children, child => {
            if (isComposeParentElement(child)) return;
            const zIndexedChild = find(child.children, child => child.style.zIndex);
            if (!zIndexedChild) return;
            zIndexedChild.style.zIndex = '1';
          });
        }
      });
  }
  setTitle(title: string) {
    this._title = title;
    this._render();
  }
  setMinimized(minimized: boolean) {
    if (minimized) {
      this._element.classList.add('inboxsdk__minimized');
      this._eventStream.emit({eventName:'minimize'});
    } else {
      this._element.classList.remove('inboxsdk__minimized');
      this._eventStream.emit({eventName:'restore'});
    }
  }
  getMinimized() {
    return this._element.classList.contains('inboxsdk__minimized');
  }
  getEventStream(): Kefir.Observable<Object> {
    return this._eventStream;
  }
  destroy() {
    ReactDOM.unmountComponentAtNode(this._element);
    this._stopper.destroy();
    this._eventStream.end();
    this._element.remove();
  }
}

function isComposeParentElement(el: Element): boolean {
  return !el.classList.contains('inboxsdk__mole_view') && el.hasAttribute('jsaction');
}

export default defn(module, InboxMoleViewDriver);

type MoleViewContentsProps = {
  title: string;
  el: HTMLElement;
};

class MoleViewContents extends React.Component {
  props: MoleViewContentsProps;
  _content: HTMLElement;

  render() {
    return (
      <div
        className="inboxsdk__mole_view_mid"
      >
        <div className="inboxsdk__mole_view_inner">
          <div className="inboxsdk__mole_view_titlebar">
            {this.props.title}
          </div>
          <div className="inboxsdk__mole_view_content" ref={el => this._content = el} />
        </div>
      </div>
    );
  }

  componentDidMount() {
    this._content.appendChild(this.props.el);
  }
}
