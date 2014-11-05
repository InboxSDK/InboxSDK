var RSVP = require('rsvp');
var waitFor = require('../../lib/wait-for');

var GmailElementGetter = {

	waitForGmailModeToSettle: function(){
		return new RSVP.Promise(function(resolve, reject){
			if(document.body.classList.length > 0){
				resolve();
			}

			var mutationObserver = new MutationObserver(function(mutations){
				var classList = mutations[0].target.classList;

				if(classList.length > 0){
					mutationObserver.disconnect();
					resolve();
				}
			});

			mutationObserver.observe(
				document.body,
				{attributes: true, attributeFilter: ['class']}
			);
		});
	},

	isStandaloneComposeWindow: function(){
		return document.body.classList.contains('xE') && document.body.classList.contains('xp');
	},

	isStandaloneThreadWindow: function(){
		return document.body.classList.contains('aAU') && document.body.classList.contains('xE') && document.body.classList.contains('Su');
	},

	getComposeWindowContainer: function(){
		return document.querySelector('.dw .nH > .nH > .no');
	},

	getMainContentContainer: function(){
		var mainContentElement = GmailElementGetter.getCurrentMainContentElement();

		if(!mainContentElement){
			return null;
		}

		return mainContentElement.parentElement;
	},

	getCurrentMainContentElement: function(){
		return document.querySelector('div[role=main]');
	},

	getToolbarElementContainer: function(){
		return document.querySelector('[gh=tm]').parentElement;
	},

	getToolbarElement: function(){
		return document.querySelector('[gh=tm]');
	},

	getThreadToolbarElement: function(){
		return document.querySelector('[gh=mtb]');
	}

};

GmailElementGetter.StandaloneCompose = {

	getComposeWindowContainer: function(){
		return document.querySelector('[role=main]');
	}

};

module.exports = GmailElementGetter;
