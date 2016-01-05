/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import {defn} from 'ud';
import EventEmitter from '../lib/safe-event-emitter';

import type GmailModalViewDriver from '../dom-driver/gmail/widgets/gmail-modal-view-driver';

// documented in src/docs/
class ModalView extends EventEmitter {
    _driver: ?GmailModalViewDriver;
    constructor(options: {modalViewDriver: GmailModalViewDriver}) {
        super();
        this._driver = options.modalViewDriver;
        options.modalViewDriver.getEventStream().filter(event =>
            event.eventName === 'closeClick'
        ).onValue(() => {
            this.close();
        });
        options.modalViewDriver.getEventStream().onEnd(() => {
            this._driver = null;
            this.emit('destroy');
        });
    }

    show(){
        const driver = this._driver;
        if(!driver){
            throw new Error('Modal can not be shown after being hidden');
        }

        document.body.appendChild(driver.getOverlayElement());
        document.body.appendChild(driver.getModalContainerElement());

        driver.getModalContainerElement().focus();

        Kefir.fromEvents(document.body, 'keydown')
            .filter(domEvent =>
                domEvent.keyCode === 27
            )
            .takeUntilBy(Kefir.fromEvents(this, 'destroy'))
            .onValue(domEvent => {
                domEvent.stopImmediatePropagation();
                domEvent.stopPropagation();
                domEvent.preventDefault();
                this.close();
            });

        //don't bubble key events to gmail
        Kefir.fromEvents(document.body, 'keydown')
            .takeUntilBy(Kefir.fromEvents(this, 'destroy'))
            .onValue(domEvent => {
                domEvent.stopPropagation();
            });

        Kefir.fromEvents(document.body, 'keyup')
            .takeUntilBy(Kefir.fromEvents(this, 'destroy'))
            .onValue(domEvent => {
                domEvent.stopPropagation();
            });

        Kefir.fromEvents(document.body, 'keypress')
            .takeUntilBy(Kefir.fromEvents(this, 'destroy'))
            .onValue(domEvent => {
                domEvent.stopPropagation();
            });
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

export default defn(module, ModalView);
