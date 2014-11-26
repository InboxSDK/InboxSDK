var _ = require('lodash');
var Bacon = require('baconjs');

var extId = ''+Math.random();

module.exports = function(gmailComposeView){

    var bodyElement = gmailComposeView.getBodyElement();
    var fixupCursorFunction = _.once(_fixupCursor.bind(null, gmailComposeView))


    gmailComposeView.getEventStream().startWith({eventName: 'bodyChanged'}).filter(function(event){
        return event.eventName === 'bodyChanged';
    }).debounceImmediate(100).onValue(function(){
        var chips = bodyElement.querySelectorAll('[hspace=inboxsdk__chip]');
        _.chain(chips)
            .map(_getChipContainer)
            .filter(_isNotEnhanced)
            .each(_addEnhancements)
            .each(fixupCursorFunction);
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
    var anchor = chipElement.querySelector('a');
    if (anchor) {
      anchor.addEventListener('mousedown', function(e) {
        e.stopImmediatePropagation();
      }, true);
      anchor.addEventListener('click', function(e) {
        e.stopImmediatePropagation();
      }, true);
    }

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

    chipElement.addEventListener(
        'mousedown',
        function(e){
            e.preventDefault();
        }
    );

    chipElement.contentEditable = false;
    chipElement.setAttribute('data-sdk-linkchip-claimed', extId);
    chipElement._linkChipEnhancedByThisExtension = true;
}

function _fixupCursor(gmailComposeView){

    var keydownStream = Bacon.fromEventTarget(gmailComposeView.getBodyElement(), 'keydown');

    var streamAction = _checkAndAction.bind(null, keydownStream);

    streamAction(37, 'previousSibling', _moveCursor.bind(null, 'setStart', true)); //left arrow
    streamAction(39, 'nextSibling', _moveCursor.bind(null, 'setEnd', false)); //right arrow

    streamAction(8, 'previousSibling', _delete.bind(null, 'setEndAfter', 'setStartBefore')); //backspace
    streamAction(46, 'nextSibling', _delete.bind(null, 'setStartBefore', 'setEndAfter')); //"delete"

}

function _checkAndAction(keyupStream, keyCode, siblingProperty, action){
    keyupStream.filter(function(event){
        return event.which === keyCode;
    }).onValue(function(event){
        var range = document.getSelection().getRangeAt(0);
        if(!range.startContainer){
            return;
        }

        var container;
        if(range.startContainer.nodeType === 3){
            if(siblingProperty === 'previousSibling' && range.startOffset === 1 && range.startContainer.textContent.charAt(0) === '\u200b'){
                container = range.startContainer;
            }
            else if(siblingProperty === 'nextSibling' && range.startOffset === range.startContainer.length && range.startContainer.textContent.charAt(range.startContainer.length - 1) === '\u200b'){
                container = range.startContainer;
            }
            else if(siblingProperty === 'previousSibling' && range.startOffset === 0 || siblingProperty === 'nextSibling' && range.startOffset === range.startContainer.length){
                container = range.startContainer;
            }

            if(!container || !container[siblingProperty] || !container[siblingProperty]._linkChipEnhancedByThisExtension){
                return;
            }
        }
        else if(range.startContainer[siblingProperty] && range.startContainer[siblingProperty]._linkChipEnhancedByThisExtension){
            container = range.startContainer;
        }
        else if(range.startContainer.nodeType !== 3 && range.startOffset){
            container = range.startContainer.childNodes[range.startOffset-1];
            if(!container[siblingProperty] || !container[siblingProperty]._linkChipEnhancedByThisExtension){
                return;
            }
        }
        else{
            if(range.startOffset === 0 && siblingProperty === 'nextSibling' && range.startContainer.childNodes[0].nodeType === 3 && range.startContainer.childNodes[0].textContent === '\u200b'){
                container = range.startContainer.childNodes[0];
            }
            else{
                return;
            }
        }

        if(!container[siblingProperty][siblingProperty]){
            return;
        }


        action(range, container[siblingProperty][siblingProperty], container, event);
    });
}

function _moveCursor(rangeBoundary, collapseToStart, range, element, startElement, event){
    var newRange = range.cloneRange();

    if(rangeBoundary === 'setStart'){
        newRange[rangeBoundary](element, element.length - 1);
    }
    else{
        newRange[rangeBoundary](element, 1);
    }


    if(range.collapsed){
        newRange.collapse(collapseToStart);
    }

    document.getSelection().removeAllRanges();
    document.getSelection().addRange(newRange);

    event.preventDefault();
}

function _delete(startElementRangePoint, elementRangePoint, range, element, startElement, event){
    range[startElementRangePoint](startElement);
    range[elementRangePoint](element);

    range.deleteContents();

    event.preventDefault();
}
