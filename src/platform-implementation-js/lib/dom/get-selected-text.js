module.exports = function(element, range){
    element.focus();

    if(!range){
        let selection = document.getSelection();
        if(!selection){
            return null;
        }

        if(selection.rangeCount < 1){
            return null;
        }

        range = selection.getRangeAt(0);
        if(!range){
            return null;
        }
    }

    return range.toString();
};
