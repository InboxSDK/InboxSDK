if(WeakMap){

var chipMap = new WeakMap();

module.exports = function(gmailComposeView){

    var bodyElement = gmailComposeView.getBodyElement();

    gmailComposeView.getEventStream().startWith({eventName: 'bodyChanged'}).filter(function(event){
        return event.eventName === 'bodyChanged';
    }).debounceImmediate(100).onValue(function(){            
        var chips = bodyElement.querySelectorAll('.inboxsdk__compose_linkChip');
        Array.prototype.filter.call(chips, _isNotEnhanced).forEach(_addEnhancements);
    });

};


function _isNotEnhanced(chipElement){
    return !chipMap.has(chipElement);
}


function _addEnhancements(chipElement){
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

    chipMap.set(chipElement, true);
}


}
