var makeMutationObserverStream = require('../../../../lib/dom/make-mutation-observer-stream');


module.exports = function(gmailComposeView){
    var bodyElement = gmailComposeView.getBodyElement();

    return makeMutationObserverStream(bodyElement, {childList: true, subtree: true, characterData: true}).map(function(){
        return {eventName: 'bodyChanged'};
    });
};
