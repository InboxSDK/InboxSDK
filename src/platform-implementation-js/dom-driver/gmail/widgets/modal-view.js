var _ = require('lodash');
var BasicClass = require('../../../lib/basic-class');

var ModalView = function(options){
    BasicClass.call(this);

    this._setupOverlayElement();
    this._setupModalContainerElement(options);

    this.setTitle(options.title);
    this.setContentElement(options.el);
    this.setButtons(options.buttons);
};

ModalView.prototype = Object.create(BasicClass.prototype);

_.extend(ModalView.prototype, {

    __memberVariables: [
        {name: '_overlayElement', destroy: true, get: true},
        {name: '_modalContainerElement', destroy: true, get: true}
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
        var element = document.createElement('div');
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

        element.innerHTML = htmlString;
        this._modalContainerElement = element.children[0];
    }
});

module.exports = ModalView;
