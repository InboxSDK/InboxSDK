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
import ElementContainer from '../../../lib/react/ElementContainer';
import type {MoleViewDriver, MoleOptions, MoleButtonDescriptor} from '../../../driver-interfaces/mole-view-driver';
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

    this._title = String(this._options.title || '');

    this._render();
    (this._element.firstElementChild:any).style.zIndex = '1';

    Kefir.fromEvents(this._element, 'click')
      .takeUntilBy(this._stopper)
      .onValue(event => {
        this._reemitClickEvent(event);
      });
  }
  _reemitClickEvent(event: MouseEvent) {
    // Inbox is going to block this event from bubbling to the body. We
    // want to manually dispatch an event that looks like it so that if
    // the extension is using React (which listens to events on the body)
    // then React will see it.
    const fakeEvent = new MouseEvent('click');
    Object.defineProperties(fakeEvent, {
      target: {value: event.target},
      detail: {value: event.detail},
      screenX: {value: event.screenX},
      screenY: {value: event.screenY},
      clientX: {value: event.clientX},
      clientY: {value: event.clientY},
      button: {value: event.button},
      buttons: {value: event.buttons},
      ctrlKey: {value: event.ctrlKey},
      shiftKey: {value: event.shiftKey},
      altKey: {value: event.altKey},
      metaKey: {value: event.metaKey},
    });
    document.dispatchEvent(fakeEvent);
  }
  _render() {
    ReactDOM.render(
      <MoleViewContents
        title={this._title}
        titleEl={this._options.titleEl}
        el={this._options.el}
        chrome={this._options.chrome}
        titleButtons={this._options.titleButtons}
        minimized={this.getMinimized()}
        onClose={() => {
          // React doesn't like it when you unmount a component within a React
          // event handler, so we do it async.
          Promise.resolve().then(() => {
            this.destroy();
          });
        }}
        onSetMinimize={minimized => this.setMinimized(minimized)}
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
    if (this._element.classList.contains('inboxsdk__mole_at_front')) return;
    this._element.classList.add('inboxsdk__mole_at_front');

    const container = this._element.parentElement;
    if (!(container instanceof HTMLElement)) throw new Error('mole not in document');
    const selfIndex = Array.prototype.indexOf.call(container.children, this._element);
    if (selfIndex < 0) throw new Error('should not happen');
    const count = container.children.length;

    const firstComposeParent = find(container.children, isComposeParentElement);
    if (firstComposeParent) {
      // emit a fake focus event so Inbox puts this (the right-most) composeview on top
      firstComposeParent.dispatchEvent(new FocusEvent('focus'));
    }

    // Put all the moles into the proper order.
    Array.prototype.forEach.call(container.children, (child, i) => {
      if (!child.classList.contains('inboxsdk__mole_view')) return;
      if (child !== this._element) {
        child.classList.remove('inboxsdk__mole_at_front');
      }
      const zIndexedChild = find(child.children, child => child.style.zIndex);
      if (!zIndexedChild) return;
      zIndexedChild.style.zIndex = String(i > selfIndex ? count-(i-selfIndex) : count);
    });

    // Wait until the next time either a compose is brought to the front or a
    // mole is brought to the front. If a compose was brought to the front, then
    // we need to put all the moles to the back. If a mole was brought to the
    // front, then do nothing because that mole's _bringToFront function will
    // handle the composes and the moles.
    Kefir.merge([
      // The user tried to focus the compose that Inbox still thinks is at the
      // front.
      !firstComposeParent ? null : fromEventTargetCapture(firstComposeParent, 'focus'),

      // A new compose was added.
      makeMutationObserverChunkedStream(container, {childList: true})
        .filter(mutations => mutations.some(mutation => mutation.addedNodes.length > 0))
    ].concat(Array.prototype.map.call(container.children, el => {
      const zIndexedChild = find(el.children, child => child.style.zIndex);
      if (!zIndexedChild) return null;
      const currentZindex = zIndexedChild.style.zIndex;
      return makeMutationObserverChunkedStream(zIndexedChild, {attributes: true, attributeFilter: ['style']})
        .filter(() => zIndexedChild.style.zIndex !== currentZindex);
    })).filter(Boolean))
      .takeUntilBy(this._stopper)
      .take(1)
      .onValue(() => {
        if (this._element.classList.contains('inboxsdk__mole_at_front')) {
          this._element.classList.remove('inboxsdk__mole_at_front');
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
    this._title = String(title);
    this._render();
  }
  setMinimized(minimized: boolean) {
    if (minimized) {
      this._element.classList.add('inboxsdk__minimized');
      this._render();
      this._eventStream.emit({eventName:'minimize'});
    } else {
      this._element.classList.remove('inboxsdk__minimized');
      this._render();
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
  titleEl?: ?HTMLElement;
  minimizedTitleEl?: ?HTMLElement;
  el: HTMLElement;
  chrome?: ?boolean;
  titleButtons?: ?Array<MoleButtonDescriptor>;
  minimized: boolean;
  onClose: ()=>void;
  onSetMinimize: (minimized: boolean)=>void;
};

class MoleViewContents extends React.Component {
  props: MoleViewContentsProps;

  render() {
    let titlebar = null;
    if (this.props.chrome !== false) {
      let title;
      if (this.props.minimized && this.props.minimizedTitleEl) {
        title = <ElementContainer
          className="inboxsdk__mole_view_title"
          el={this.props.minimizedTitleEl}
        />;
      } else if (this.props.titleEl) {
        title = <ElementContainer
          className="inboxsdk__mole_view_title"
          el={this.props.titleEl}
        />;
      } else {
        title = (
          <div className="inboxsdk__mole_view_title">
            {this.props.title}
          </div>
        );
      }

      const titleButtons = (this.props.titleButtons || []).map((descriptor, i) => {
        return (
          <button
            type="button"
            key={i}
            title={descriptor.title}
            onClick={event => {
              event.stopPropagation();
              descriptor.onClick();
            }}
          >
            <img className={descriptor.iconClass} src={descriptor.iconUrl} alt="" aria-hidden="true" />
          </button>
        );
      });

      titlebar = (
        <div
          className="inboxsdk__mole_view_titlebar"
          onClick={() => {
            if (this.props.minimized) {
              this.props.onSetMinimize(false);
            }
          }}
        >
          {title}
          <button
            type="button"
            style={{display: this.props.minimized ? "none" : ""}}
            title="Minimize"
            onClick={() => this.props.onSetMinimize(true)}
          >
            <img srcSet="//ssl.gstatic.com/bt/C3341AA7A1A076756462EE2E5CD71C11/2x/btw_ic_minimize_white_18dp_2x.png 2x" alt="" aria-hidden="true" src="//ssl.gstatic.com/bt/C3341AA7A1A076756462EE2E5CD71C11/1x/btw_ic_minimize_white_18dp.png" />
          </button>
          <button
            type="button"
            style={{display: this.props.minimized ? "" : "none"}}
            title="Expand"
            onClick={() => this.props.onSetMinimize(false)}
          >
            <img srcSet="//ssl.gstatic.com/bt/C3341AA7A1A076756462EE2E5CD71C11/2x/btw_ic_maximize_white_18dp_2x.png 2x" alt="" aria-hidden="true" src="//ssl.gstatic.com/bt/C3341AA7A1A076756462EE2E5CD71C11/1x/btw_ic_maximize_white_18dp.png" />
          </button>
          {titleButtons}
          <button
            type="button"
            title="Close"
            onClick={() => this.props.onClose()}
          >
            <img srcSet="//ssl.gstatic.com/bt/C3341AA7A1A076756462EE2E5CD71C11/2x/btw_ic_close_white_12dp_2x.png 2x" alt="" aria-hidden="true" src="//ssl.gstatic.com/bt/C3341AA7A1A076756462EE2E5CD71C11/1x/btw_ic_close_white_12dp.png" />
          </button>
        </div>
      );
    }

    return (
      <div className="inboxsdk__mole_view_mid">
        <div className="inboxsdk__mole_view_inner">
          {titlebar}
          <ElementContainer className="inboxsdk__mole_view_content" el={this.props.el} />
        </div>
      </div>
    );
  }
}
