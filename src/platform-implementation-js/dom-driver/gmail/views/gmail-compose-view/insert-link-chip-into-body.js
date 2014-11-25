var _ = require('lodash');
var RSVP = require('rsvp');
var Bacon = require('baconjs');

function insertLinkChipIntoBody(gmailComposeView, options){
    return new RSVP.Promise(function(resolve, reject){
        _insertLinkChipIntoBody(gmailComposeView, options);
        resolve();
    });
}

function _insertLinkChipIntoBody(gmailComposeView, options){
    gmailComposeView.getBodyElement().focus();

    var chipElement = _getChipElement(options);

    // Gmail compose treats text directly bordering the chipElement weirdly in
    // regards to cursor movement, so surround the chip with newlines which
    // makes Gmail act up a little less.
    var frag = document.createDocumentFragment();
    frag.appendChild(document.createTextNode('\u200b'));
    frag.appendChild(chipElement);
    frag.appendChild(document.createTextNode('\u200b'));

    require('../../../../lib/dom/insert-html-at-cursor')(gmailComposeView.getBodyElement(), frag, gmailComposeView.getSelectionRange());
}

function _getChipElement(options){
    var chipElement = document.createElement("div");

    var chipHTML = [
        '<div contenteditable="false" class="inboxsdk__compose_linkChip" style="width: 396px; height: 18px; max-height: 18px; padding: 5px; color: rgb(34, 34, 34); font-family: arial; font-style: normal; font-weight: bold; font-size: 13px; cursor: default; border: 1px solid rgb(221, 221, 221); line-height: 1; background-color: rgb(245, 245, 245); -webkit-user-select: none; user-select: none;">',
            '<span hspace="inboxsdk__chip"></span>',
            '<a href="' +  _.escape(options.url) + '" target="_blank" style=" display:inline-block; max-width: 366px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-decoration: none; cursor: pointer; padding: 1px 0; border: none; ">',
              options.iconUrl ?
                '<img style="height:16px; width:16px; vertical-align: bottom; border: none;" height="16px" width="16px" src="' +  _.escape(options.iconUrl) + '">&nbsp;' :
                '',
                '<span dir="ltr" style="color: rgb(17, 85, 204); text-decoration: none; vertical-align: bottom;">' + _.escape(options.text) + '</span>',
            '</a>',
        '</div>'
    ].join('');

    chipElement.innerHTML = chipHTML;
    chipElement = chipElement.children[0];

    return chipElement;
}

module.exports = insertLinkChipIntoBody;
