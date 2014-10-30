var GmailElementGetter = {

	getComposeWindowContainer: function(){
		return document.querySelector('.dw .nH > .nH > .no');
	},

	getMainContentContainer: function(){
		var mainContentElement = GmailElementGetter.getCurrentMainContentElement();

		if(!mainContentElement){
			return null;
		}

		return mainContentElement.parentNode;
	},

	getCurrentMainContentElement: function(){
		return document.querySelector('div[role=main]');
	}

};

module.exports = GmailElementGetter;
