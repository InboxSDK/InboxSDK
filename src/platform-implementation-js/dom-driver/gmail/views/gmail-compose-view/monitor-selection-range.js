const Bacon = require('baconjs');

module.exports = function(gmailComposeView){
    Bacon.mergeAll(
        Bacon.fromEventTarget(document.body, 'mousedown'),
        Bacon.fromEventTarget(document.body, 'keydown')
    ).takeUntil(gmailComposeView.getEventStream().filter(false).mapEnd())
    .onValue(function(event){
        const body = gmailComposeView.getBodyElement();
        const selection = document.getSelection();
        if(body && selection && selection.rangeCount > 0 && body.contains(selection.anchorNode)){
            gmailComposeView.setLastSelectionRange(selection.getRangeAt(0));
        }
        else{
            gmailComposeView.setLastSelectionRange(null);
        }
    });
};
