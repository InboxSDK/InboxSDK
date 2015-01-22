'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');
var fromEventTargetCapture = require('../lib/from-event-target-capture');

var EventEmitter = require('events').EventEmitter;

function ModalView(options){
    EventEmitter.call(this);

    this._driver = options.modalViewDriver;
    this._driver.getEventStream().filter(function(event){
        return event.eventName === 'closeClick';
    }).onValue(this, 'close');
}

ModalView.prototype = Object.create(EventEmitter.prototype);

_.extend(ModalView.prototype, {

    show: function(){
        if(!this._driver){
            throw new Error('Modal can not be shown after being hidden');
        }

        document.body.appendChild(this._driver.getOverlayElement());
        document.body.appendChild(this._driver.getModalContainerElement());

        this._driver.getModalContainerElement().focus();

        var self = this;

        fromEventTargetCapture(document.body, 'keydown')
            .filter(function(domEvent){
                return domEvent.keyCode === 27;
            })
            .takeWhile(function(){
                return !!self._driver;
            })
            .doAction(function(domEvent){
                domEvent.stopImmediatePropagation();
                domEvent.stopPropagation();
                domEvent.preventDefault();
             })
             .onValue(this, 'close');

    },

    close: function(){
        if (this._driver) {
            this._driver.getOverlayElement().remove();
            this._driver.getModalContainerElement().remove();
            this._driver = null;
            this.emit('destroy');
        }
    },

    /*
    * options = {
    * 	iconUrl: ,
    * 	tooltip,
    * 	callback:
    * }
    */
    addButton: function(options){
        throw new Error("not implemented");
        //this._attachmentCardImplementation.addButton(options);
    }
});

module.exports = ModalView;
