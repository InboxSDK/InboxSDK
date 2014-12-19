var RSVP = require('rsvp');
var waitFor = require('../../lib/wait-for');

var $ = require('jquery');

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

	isStandalone: function(){
		return GmailElementGetter.isStandaloneComposeWindow() || GmailElementGetter.isStandaloneThreadWindow();
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

	getFullscreenComposeWindowContainer: function(){
		return document.querySelector('.aSs .aSt');
	},

	getContentSectionElement: function(){
		var mainContentElement = GmailElementGetter.getMainContentContainer();
		if(!mainContentElement){
			return null;
		}

		var sectionParent = $(mainContentElement).parents().filter('.nn');
		if(sectionParent.length === 0){
			return null;
		}

		return sectionParent[0];
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

	isPreviewPane: function(){
		return !!document.querySelector('.aia');
	},

	getRowListElements: function(){
		return document.querySelectorAll('[gh=tl]');
	},

	getToolbarElementContainer: function(){
		return document.querySelector('[gh=tm]').parentElement;
	},

	getToolbarElement: function(){
		return document.querySelector('[gh=tm]');
	},

	getThreadToolbarElement: function(){
		return document.querySelector('[gh=mtb]');
	},

	getThreadContainerElement: function(){
		return document.querySelector('[role=main] .g.id table.Bs > tr');
	},

	getSidebarContainerElement: function(){
		return document.querySelector('[role=main] table.Bs > tr .y3');
	},

	getComposeButton: function(){
		return document.querySelector('[gh=cm]');
	},

	getLeftNavContainerElement: function(){
		return document.querySelector('.aeN');
	},

	getNavItemMenuInjectionContainer: function(){
		return document.querySelectorAll('.aeN .n3')[0];

	}

};

GmailElementGetter.StandaloneCompose = {

	getComposeWindowContainer: function(){
		return document.querySelector('[role=main]');
	}

};

module.exports = GmailElementGetter;
