var Bacon = require('baconjs');

module.exports = function(gmailComposeView){
    var body = gmailComposeView.getBodyElement();

    Bacon.mergeAll(
        Bacon.fromEventTarget(body, 'mouseup'),
        Bacon.fromEventTarget(body, 'keyup'),
        Bacon.fromEventTarget(body, 'input'),
        gmailComposeView.getEventStream().filter(function(event){
            return event.eventName === 'bodyChanged';
        })
    ).debounceImmediate(10).onValue(function(){
        if(document.getSelection() && document.getSelection().rangeCount > 0){
            gmailComposeView.setSelectionRange(document.getSelection().getRangeAt(0));
        }
        else{
            gmailComposeView.setSelectionRange(null);
        }
    });
};
