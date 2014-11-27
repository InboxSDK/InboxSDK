module.exports = function(node, range){
    if(!range){
        return false;
    }

    if(!node){
        return false;
    }

    var newRange = document.createRange();
    newRange.selectNode(node);

    return newRange.compareBoundaryPoints(Range.START_TO_END, range) < 1 && range.compareBoundaryPoints(Range.START_TO_END, newRange) < 1;
};
