var _ = require('lodash');
var RSVP = require('rsvp');
var Bacon = require('baconjs');

function insertLinkChipIntoBody(gmailComposeView, options){
    return new RSVP.Promise(function(resolve, reject){
        if(document.hasFocus()){
            _insertLinkChipIntoBody(gmailComposeView, options);
            resolve();
        }
        else{
            Bacon.fromEventTarget(window, 'focus').take(1).onValue(function(){
                _insertLinkChipIntoBody(gmailComposeView, options);
                resolve();
            });
        }
    });
}

function _insertLinkChipIntoBody(gmailComposeView, options){
    gmailComposeView.getBodyElement().focus();

    var chipElement = _getChipElement(options);

    require('../../../../lib/dom/insert-html-at-cursor')(gmailComposeView.getBodyElement(), chipElement);
}

function _getChipElement(options){
    var chipElement = document.createElement("div");

    var chipHTML = [
        '<div contenteditable="false" class="gmail_chip gmail_drive_chip" style="width: 396px; height: 18px; max-height: 18px; padding: 5px; color: rgb(34, 34, 34); font-family: arial; font-style: normal; font-weight: bold; font-size: 13px; cursor: default; border: 1px solid rgb(221, 221, 221); line-height: 1; background-color: rgb(245, 245, 245); -webkit-user-select: none; user-select: none;">',
            '<a href="' +  _.escape(options.url) + '" target="_blank" style=" display:inline-block; max-width: 366px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-decoration: none; cursor: pointer; padding: 1px 0; border: none; ">',
              options.iconUrl ?
                '<img style="vertical-align: bottom; border: none;" src="' +  _.escape(options.iconUrl) + '">&nbsp;' :
                '',
                '<span dir="ltr" style="color: rgb(17, 85, 204); text-decoration: none; vertical-align: bottom;">' + _.escape(options.text) + '</span>',
            '</a>',
        '</div>'
    ].join('');

    chipElement.innerHTML = chipHTML;
    chipElement = chipElement.children[0];


    var xElement = document.createElement('div');
    xElement.innerHTML = '<img src="//ssl.gstatic.com/ui/v1/icons/common/x_8px.png" style="opacity: 0.55; cursor: pointer; float: right; position: relative; top: -1px;">';
    xElement = xElement.children[0];

    xElement.addEventListener('click', function(e){
        chipElement.remove();
    });


    chipElement.addEventListener(
        'mouseenter',
        function(){
            chipElement.appendChild(xElement);
            chipElement.querySelector('a > span').style.textDecoration = 'underline';
        }
    );

    chipElement.addEventListener(
        'mouseleave',
        function(){
            xElement.remove();
            chipElement.querySelector('a > span').style.textDecoration = 'none';
        }
    );


    return chipElement;


}

module.exports = insertLinkChipIntoBody;
