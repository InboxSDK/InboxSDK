var _ = require('lodash');
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
