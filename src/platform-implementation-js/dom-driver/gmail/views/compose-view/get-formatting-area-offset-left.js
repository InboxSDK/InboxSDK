function getFormattingAreaOffsetLeft(gmailComposeView){
	var formattingArea = gmailComposeView.getFormattingArea();
	if (!formattingArea) {
		return 0;
	}

	var offset = formattingArea.offset();
	if (!offset) {
		return 0;
	}

	return offset.left;
}


module.exports = getFormattingAreaOffsetLeft;
