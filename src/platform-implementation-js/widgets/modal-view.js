/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import {defn} from 'ud';
import EventEmitter from '../lib/safe-event-emitter';

import type GmailModalViewDriver from '../dom-driver/gmail/widgets/gmail-modal-view-driver';

// documented in src/docs/
class ModalView extends EventEmitter {
    destroyed: boolean;
    _driver: ?GmailModalViewDriver;
    constructor(options: {modalViewDriver: GmailModalViewDriver}) {
        super();
        this.destroyed = false;
        this._driver = options.modalViewDriver;
        options.modalViewDriver.getEventStream().filter(event =>
            event.eventName === 'closeClick'
        ).onValue(() => {
            this.close();
        });
        options.modalViewDriver.getEventStream().onEnd(() => {
            this._driver = null;
            this.destroyed = true;
            this.emit('destroy');

            _handleModalStackOnModalDestroy(this);
        });
    }

    show(){
        const driver = this._driver;
        if(!driver){
            throw new Error('Modal can not be shown after being hidden');
        }

        const hideAndDestroyStream = Kefir.merge([
          Kefir.fromEvents(this, 'destroy'),
          hideStream.filter(modalView => modalView === this)
        ]);

        document.body.appendChild(driver.getOverlayElement());
        document.body.appendChild(driver.getModalContainerElement());

        driver.getModalContainerElement().focus();

        Kefir.fromEvents(document.body, 'keydown')
            .filter(domEvent =>
                domEvent.keyCode === 27
            )
            .takeUntilBy(hideAndDestroyStream)
            .onValue(domEvent => {
                domEvent.stopImmediatePropagation();
                domEvent.stopPropagation();
                domEvent.preventDefault();
                this.close();
            });

        //don't bubble key events to gmail
        Kefir.fromEvents(document.body, 'keydown')
            .takeUntilBy(hideAndDestroyStream)
            .onValue(domEvent => {
                domEvent.stopPropagation();
            });

        Kefir.fromEvents(document.body, 'keyup')
            .takeUntilBy(hideAndDestroyStream)
            .onValue(domEvent => {
                domEvent.stopPropagation();
            });

        Kefir.fromEvents(document.body, 'keypress')
            .takeUntilBy(hideAndDestroyStream)
            .onValue(domEvent => {
                domEvent.stopPropagation();
            });

        _replaceCurrentlyShowingModal(this, driver);
    }

    setTitle(title: string){
        if(!this._driver){
            throw new Error('Modal can not be shown after being hidden');
        }

        this._driver.setTitle(title);
    }

    close(){
        if (this._driver) {
            this._driver.destroy();
        }
    }

    addButton(options: any): void {
        throw new Error("not implemented");
    }

}

let currentlyShowingModal: ?{modalView: ModalView, driver: GmailModalViewDriver} = null;
const hideStream: Kefir.Bus<ModalView> = kefirBus();
const hiddenModalStack: Array<ModalView> = [];

function _handleModalStackOnModalDestroy(modalView){
  if(currentlyShowingModal && currentlyShowingModal.modalView === modalView){
    currentlyShowingModal = null;
    // we have modals in the stack
    if(hiddenModalStack.length > 0){
      hiddenModalStack.pop().show();
    }
  }
  else if(hiddenModalStack.indexOf(modalView) > -1){
    hiddenModalStack.splice(hiddenModalStack.indexOf(modalView), 1);
  }
}

function _replaceCurrentlyShowingModal(modalView, driver){
  if(currentlyShowingModal){
    hideStream.emit(currentlyShowingModal.modalView);
    hiddenModalStack.push(currentlyShowingModal.modalView);
    document.body.removeChild(currentlyShowingModal.driver.getOverlayElement());
    document.body.removeChild(currentlyShowingModal.driver.getModalContainerElement());
  }

  currentlyShowingModal = {modalView, driver};
}

export default defn(module, ModalView);
