var Bacon = require('baconjs');

module.exports = function(gmailComposeView){

    var bodyElement = gmailComposeView.getBodyElement();

    return Bacon.fromBinder(function(sink){

        var mutationObserver = new MutationObserver(function(){
            sink({eventName: 'bodyChanged'});
        });

        mutationObserver.observe(bodyElement, {childList: true, subtree: true, characterData: true});

        return function(){
            mutationObserver.disconnect();
        };

    });

};
