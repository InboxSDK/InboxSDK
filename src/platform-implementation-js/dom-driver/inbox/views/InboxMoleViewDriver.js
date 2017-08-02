/* @flow */

import {defn} from 'ud';
import React from 'react';
import ReactDOM from 'react-dom';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';
import type {MoleViewDriver, MoleOptions} from '../../../driver-interfaces/mole-view-driver';
import kefirBus from 'kefir-bus';

class InboxMoleViewDriver {
  _options: MoleOptions;
  _stopper = kefirStopper();
  _eventStream = kefirBus();
  _element: HTMLElement;
  _title: string;
  _zIndex: number = 0;

  constructor(options: MoleOptions) {
    (this: MoleViewDriver);
    this._options = options;
    this._element = document.createElement('div');
    this._element.className = 'inboxsdk__mole_view '+(options.className||'');
    this._element.setAttribute('jsaction', 'global.none');

    this._title = this._options.title || '';

    this._render();
  }
  _render() {
    ReactDOM.render(
      <MoleViewContents
        zIndex={this._zIndex}
        title={this._title}
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

    // Keep the mole as the first item in the list
    makeMutationObserverChunkedStream(container, {childList: true})
      .takeUntilBy(this._stopper)
      .onValue(muts => {
        const composeWasAdded = container.firstElementChild && !container.firstElementChild.classList.contains('inboxsdk__mole_view');

        if (composeWasAdded) {
          container.insertBefore(this._element, container.firstElementChild);
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

export default defn(module, InboxMoleViewDriver);

type MoleViewContentsProps = {
  zIndex: number;
  title: string;
};

class MoleViewContents extends React.Component {
  props: MoleViewContentsProps;

  render() {
    return (
      <div
        className="inboxsdk__mole_view_mid"
        style={{
          zIndex: this.props.zIndex
        }}
      >
        <div className="inboxsdk__mole_view_inner">
          <div className="inboxsdk__mole_view_titlebar">
            {this.props.title}
          </div>
          <div className="inboxsdk__mole_view_content">
            foo bar of foo
          </div>
        </div>
      </div>
    );
  }
}
