var extId = ''+Math.random();

module.exports = function(gmailComposeView){

    var bodyElement = gmailComposeView.getBodyElement();

    gmailComposeView.getEventStream().startWith({eventName: 'bodyChanged'}).filter(function(event){
        return event.eventName === 'bodyChanged';
    }).debounceImmediate(100).onValue(function(){
        var chips = bodyElement.querySelectorAll('[hspace=inboxsdk__chip]');
        Array.prototype.map.call(chips, _getChipContainer)
          .filter(_isNotEnhanced)
          .forEach(_addEnhancements);
    });

};

function _getChipContainer(span){
    return span.parentElement;
}

function _isNotEnhanced(chipElement){
    var claim = chipElement.getAttribute('data-sdk-linkchip-claimed');
    if (extId === claim) {
      return !chipElement._linkChipEnhancedByThisExtension;
    }
    return claim == null;
}


function _addEnhancements(chipElement){
    var xElement = document.createElement('div');
    xElement.innerHTML = '<img src="//ssl.gstatic.com/ui/v1/icons/common/x_8px.png" style="opacity: 0.55; cursor: pointer; float: right; position: relative; top: -1px;">';
    xElement = xElement.children[0];

    xElement.addEventListener('mousedown', function(e){
        chipElement.remove();
    }, true);

    xElement.addEventListener('click', function(e){
        e.stopImmediatePropagation();
        e.preventDefault();
    }, true);


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

    chipElement.contentEditable = false;
    chipElement.setAttribute('data-sdk-linkchip-claimed', extId);
    chipElement._linkChipEnhancedByThisExtension = true;
}
