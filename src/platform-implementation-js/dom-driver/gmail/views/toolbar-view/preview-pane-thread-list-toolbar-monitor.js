var _ = require('lodash');
var Bacon = require('baconjs');


var BasicClass = require('../../../../lib/basic-class');

var GmailToolbarView = require('../gmail-toolbar-view');
var ElementMonitor = require('../../../../lib/dom/element-monitor');
var GmailElementGetter = require('../../gmail-element-getter');
var waitFor = require('../../../../lib/wait-for');

var PreviewPaneThreadListToolbarMonitor = function(){
	BasicClass.call(this);

	this._toolbarViewStream = new Bacon.Bus();

	this._setupMonitor();
};

PreviewPaneThreadListToolbarMonitor.prototype = Object.create(BasicClass.prototype);

_.extend(PreviewPaneThreadListToolbarMonitor.prototype, {

	__memberVariables: [
		{name: '_toolbarElementMonitor', destroy: true}
	],

	getToolbarViewStream: function(){
		return this._toolbarElementMonitor.getViewAddedEventStream();
	},

	_setupMonitor: function(){
		this._toolbarElementMonitor = new ElementMonitor({

			elementMembershipTest: function(element){
				return !!element.querySelector('[gh=mtb]');
			},

			viewCreationFunction: function(element){
				return new GmailToolbarView(toolbarElement);
			}
		});


		var self = this;
		GmailElementGetter.waitForGmailModeToSettle().then(function(){
			waitFor(function(){
				return !!GmailElementGetter.getToolbarElement();
			}).then(function(){
				var toolbarContainerElement = GmailElementGetter.getToolbarElementContainer();
				self._toolbarElementMonitor.setObservedElement(toolbarContainerElement);
			});
		});
	}

});

module.exports = PreviewPaneThreadListToolbarMonitor;
