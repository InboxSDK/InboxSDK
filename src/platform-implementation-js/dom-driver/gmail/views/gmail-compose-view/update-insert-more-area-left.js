var $ = require('jquery');

function updateInsertMoreAreaLeft(gmailComposeView, oldFormattingAreaOffsetLeft){
	var newFormattingAreaOffsetLeft = gmailComposeView._getFormattingAreaOffsetLeft();
	var insertMoreAreaLeft = parseInt($(gmailComposeView.getInsertMoreArea()).css('left'), 10);

	var diff = newFormattingAreaOffsetLeft - oldFormattingAreaOffsetLeft;

	$(gmailComposeView.getInsertMoreArea()).css('left', (insertMoreAreaLeft + diff) + 'px');
}

module.exports = updateInsertMoreAreaLeft;
