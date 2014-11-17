var _ = require('lodash');
var Bacon = require('baconjs');

var BasicClass = require('../../../lib/basic-class');

var ModalView = function(options){
    BasicClass.call(this);

    this._setupOverlayElement();
    this._setupModalContainerElement(options);

    this.setTitle(options.title);
    this.setContentElement(options.el);
    this.setButtons(options.buttons);

    this._eventStream = new Bacon.Bus();
    this._setupEventStream();
};

ModalView.prototype = Object.create(BasicClass.prototype);

_.extend(ModalView.prototype, {

    __memberVariables: [
        {name: '_overlayElement', destroy: true, get: true},
        {name: '_modalContainerElement', destroy: true, get: true},
        {name: '_eventStream', get: true, destroy: true, destroyFunction: 'end'}
    ],

    setTitle: function(title){
        if(!title){
            this._modalContainerElement.querySelector('[role=heading]').style.display = 'none';
        }
        else{
            this._modalContainerElement.querySelector('[role=heading]').style.display = '';
            this._modalContainerElement.querySelector('[role=heading]').textContent = title;
        }
    },

    setContentElement: function(element){
        this._modalContainerElement.querySelector('.inboxsdk__modal_content').innerHTML = '';
        if(element){
            this._modalContainerElement.querySelector('.inboxsdk__modal_content').appendChild(element);
        }
    },

    setButtons: function(buttons){
        this._modalContainerElement.querySelector('.inboxsdk__modal_buttons').innerHTML = '';

        if(!buttons){
            this._modalContainerElement.querySelector('.inboxsdk__modal_buttons').style.display = 'none';
        }
        else{
            this._modalContainerElement.querySelector('.inboxsdk__modal_buttons').style.display = '';
        }

        //iterate and add buttons
    },

    _setupOverlayElement: function(){
        this._overlayElement = document.createElement('div');
        this._overlayElement.setAttribute('class', 'Kj-JD-Jh inboxsdk__modal_overlay');
    },

    _setupModalContainerElement: function(options){
        this._modalContainerElement = document.createElement('div');
        this._modalContainerElement.setAttribute('class', 'inboxsdk__modal_fullscreen');

        var htmlString = [
            '<div class="Kj-JD inboxsdk__modal_container" tabindex="0" role="alertdialog">',
                '<div class="Kj-JD-K7 Kj-JD-K7-GIHV4">',
                    '<span class="Kj-JD-K7-K0" role="heading"></span>',
                    '<span class="Kj-JD-K7-Jq inboxsdk__modal_close" role="button" tabindex="0"></span>',
                '</div>',
                '<div class="Kj-JD-Jz inboxsdk__modal_content" style="margin-top: 30px; margin-bottom: 30px;">',
                '</div>',
                '<div class="Kj-JD-Jl inboxsdk__modal_buttons"></div>',
            '</div>'
        ].join('');

        this._modalContainerElement.innerHTML = htmlString;
    },

    _setupEventStream: function(){
        var eventStream = this._eventStream;
        var closeElement = this._modalContainerElement.querySelector('.inboxsdk__modal_close');

        closeElement.addEventListener('click', function(event){
            eventStream.push({
                eventName: 'closeClick',
                domEvent: event
            });
        });
    }
});

module.exports = ModalView;
