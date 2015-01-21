'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');

var BasicClass = require('../lib/basic-class');

var ModalViewController = function(options){
    BasicClass.call(this);

    this._view = options.modalView;
    this._bindToEvents();
};

ModalViewController.prototype = Object.create(BasicClass.prototype);

_.extend(ModalViewController.prototype, {

    __memberVariables: [
        {name: '_view', destroy: true, get: true}
    ],

    show: function(){
        if(!this._view){
            console.warn('Modal is not in a valid state. This usually happens because you try to show the modal after closing it.');
            return;
        }

        document.body.appendChild(this._view.getOverlayElement());
        document.body.appendChild(this._view.getModalContainerElement());

        this._view.getModalContainerElement().focus();

        var self = this;

        Bacon
            .fromBinder(function(sink){
                document.body.addEventListener('keydown', sink, true);

                return function(){
                    document.body.removeEventListener('keydown', sink, true);
                };
            })
            .filter(function(domEvent){
                return domEvent.keyCode === 27;
            })
            .takeWhile(function(){
                return !!self._view;
            })
            .doAction(function(domEvent){
                domEvent.stopImmediatePropagation();
                domEvent.stopPropagation();
                domEvent.preventDefault();
             })
             .onValue(this, 'close');

    },

    close: function(){
        this._view.getOverlayElement().remove();
        this._view.getModalContainerElement().remove();

        this.destroy();
    },

    _bindToEvents: function(){
        this._view.getEventStream().filter(function(event){
            return event.eventName === 'closeClick';
        }).onValue(this, 'close');
    }
});

module.exports = ModalViewController;
