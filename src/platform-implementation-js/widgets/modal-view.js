/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import {defn} from 'ud';
import EventEmitter from '../lib/safe-event-emitter';

import type {Backdrop, Driver} from '../driver-interfaces/driver';
import type GmailModalViewDriver from '../dom-driver/gmail/widgets/gmail-modal-view-driver';
import type InboxModalView from '../dom-driver/inbox/views/inbox-modal-view';

type ModalViewDriver = GmailModalViewDriver|InboxModalView;

// documented in src/docs/
class ModalView extends EventEmitter {
    destroyed: boolean = false;
    _driver: Driver;
    _modalViewDriver: ?ModalViewDriver;
    constructor(options: {driver: Driver, modalViewDriver: ModalViewDriver}) {
        super();
        this._driver = options.driver;
        this._modalViewDriver = options.modalViewDriver;
        options.modalViewDriver.getEventStream().filter(event =>
            event.eventName === 'closeClick'
        ).onValue(() => {
            this.close();
        });
        options.modalViewDriver.getEventStream().onEnd(() => {
            this._modalViewDriver = null;
            this.destroyed = true;
            _handleModalStackOnModalDestroy(this);
            this.emit('destroy');
        });
    }

    show(){
        const modalViewDriver = this._modalViewDriver;
        if(!modalViewDriver){
            throw new Error('Modal can not be shown after being hidden');
        }

        const hideAndDestroyStream = Kefir.merge([
          Kefir.fromEvents(this, 'destroy'),
          hideStream.filter(modalView => modalView === this)
        ]);

        ((document.body:any):HTMLElement).appendChild(modalViewDriver.getModalContainerElement());

        modalViewDriver.getModalContainerElement().focus();

        Kefir.fromEvents((document.body:any), 'keydown')
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

        _replaceCurrentlyShowingModal(this, modalViewDriver);
    }

    setTitle(title: string){
        if(!this._modalViewDriver){
            throw new Error('Modal can not be shown after being hidden');
        }

        this._modalViewDriver.setTitle(title);
    }

    close(){
        if (this._modalViewDriver) {
            this._modalViewDriver.destroy();
        }
    }

    addButton(options: any): void {
        throw new Error("not implemented");
    }

}

let activeBackdrop: ?Backdrop = null;
let currentlyShowingModal: ?{modalView: ModalView, modalViewDriver: ModalViewDriver} = null;
const hideStream: Bus<ModalView> = kefirBus();
const hiddenModalStack: Array<ModalView> = [];

function _handleModalStackOnModalDestroy(modalView){
  if(currentlyShowingModal && currentlyShowingModal.modalView === modalView){
    currentlyShowingModal = null;
    // we have modals in the stack
    if(hiddenModalStack.length > 0){
      hiddenModalStack.pop().show();
    } else {
      if (activeBackdrop) {
        activeBackdrop.destroy();
      }
    }
  }
  else if(hiddenModalStack.indexOf(modalView) > -1){
    hiddenModalStack.splice(hiddenModalStack.indexOf(modalView), 1);
  }
}

function _replaceCurrentlyShowingModal(modalView, modalViewDriver){
  if(currentlyShowingModal){
    hideStream.emit(currentlyShowingModal.modalView);
    hiddenModalStack.push(currentlyShowingModal.modalView);
    currentlyShowingModal.modalViewDriver.getModalContainerElement().remove();
  } else {
    if (!activeBackdrop) {
      activeBackdrop = modalView._driver.createBackdrop(502);
      activeBackdrop.getStopper().onValue(() => {
        activeBackdrop = null;
        hiddenModalStack.slice().forEach(modalView => {
          modalView.close();
        });
        if (currentlyShowingModal) {
          currentlyShowingModal.modalView.close();
        }
      });
    }
  }

  currentlyShowingModal = {modalView, modalViewDriver};
}

export default defn(module, ModalView);
