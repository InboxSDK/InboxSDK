var _ = require('lodash');
var Bacon = require('baconjs');

var BasicClass = require('../../../lib/basic-class');

var ButtonView = require('./buttons/button-view');
var BasicButtonViewController = require('../../../widgets/buttons/basic-button-view-controller');

var GmailModalViewDriver = function(options){
    BasicClass.call(this);

    this._setupOverlayElement();
    this._setupModalContainerElement(options);

    this._processOptions(options);
    this._eventStream = new Bacon.Bus();
    this._setupEventStream();
};

GmailModalViewDriver.prototype = Object.create(BasicClass.prototype);

_.extend(GmailModalViewDriver.prototype, {

    __memberVariables: [
        {name: '_overlayElement', destroy: true, get: true},
        {name: '_modalContainerElement', destroy: true, get: true},
        {name: '_eventStream', get: true, destroy: true, destroyFunction: 'end'}
    ],

    _processOptions: function(options){
        this.setTitle(options.title);
        this.setContentElement(options.el);
        this.setButtons(options.buttons);
        this.setChrome(options.chrome);
    },

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
        if(typeof element === 'string'){
            this._modalContainerElement.querySelector('.inboxsdk__modal_content').innerHTML = element;
        }
        else if(element instanceof Element) {
            this._modalContainerElement.querySelector('.inboxsdk__modal_content').appendChild(element);
        }
    },

    setButtons: function(buttons){
        this._modalContainerElement.querySelector('.inboxsdk__modal_buttons').innerHTML = '';

        if(!buttons || buttons.length === 0){
            this._modalContainerElement.querySelector('.inboxsdk__modal_buttons').style.display = 'none';
        }
        else{
            this._modalContainerElement.querySelector('.inboxsdk__modal_buttons').style.display = '';
        }

        this._checkForMoreThanOnePrimaryButton(buttons);
        _.sortBy(buttons, function(button){
            return button.orderHint || 0;
        }).forEach(this._addButton.bind(this, this._modalContainerElement.querySelector('.inboxsdk__modal_buttons')));
    },

    setChrome: function(chrome){
        if(chrome === false){
            this._modalContainerElement.classList.add('inboxsdk__modal_chromeless');
        }
        else{
            this._modalContainerElement.classList.remove('inboxsdk__modal_chromeless');
        }
    },

    _setupOverlayElement: function(){
        this._overlayElement = document.createElement('div');
        this._overlayElement.setAttribute('class', 'Kj-JD-Jh inboxsdk__modal_overlay');
    },

    _setupModalContainerElement: function(){
        this._modalContainerElement = document.createElement('div');
        this._modalContainerElement.setAttribute('class', 'inboxsdk__modal_fullscreen');

        var htmlString = [
            '<div class="Kj-JD inboxsdk__modal_container" tabindex="0" role="alertdialog">',
                '<div class="Kj-JD-K7 Kj-JD-K7-GIHV4">',
                    '<span class="Kj-JD-K7-K0" role="heading"></span>',
                    '<span class="Kj-JD-K7-Jq inboxsdk__modal_close" role="button"></span>',
                '</div>',
                '<div class="Kj-JD-Jz inboxsdk__modal_content">',
                '</div>',
                '<div class="Kj-JD-Jl inboxsdk__modal_buttons"></div>',
            '</div>'
        ].join('');

        this._modalContainerElement.innerHTML = htmlString;
    },

    _checkForMoreThanOnePrimaryButton: function(buttons){
        if(
            _.chain(buttons)
             .pluck('type')
             .filter(function(type){return type === 'PRIMARY_ACTION';})
             .value().length > 1
         ){
             throw new Error('At most one primary button is allowed');
         }
    },

    _addButton: function(buttonContainer, buttonDescriptor){
        var buttonOptions = _.clone(buttonDescriptor);
        buttonOptions.buttonColor = (buttonDescriptor.type === 'PRIMARY_ACTION' ? 'blue' : 'default');

        var buttonView = new ButtonView(buttonOptions);

        buttonOptions.buttonView = buttonView;
        var buttonViewController = new BasicButtonViewController(buttonOptions);

        if(buttonDescriptor.type === 'PRIMARY_ACTION'){
            buttonContainer.insertBefore(buttonView.getElement(), buttonContainer.firstElementChild);
        }
        else{
            buttonContainer.appendChild(buttonView.getElement());
        }
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

module.exports = GmailModalViewDriver;
