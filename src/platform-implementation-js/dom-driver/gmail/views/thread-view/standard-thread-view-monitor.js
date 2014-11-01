var _ = require('lodash');

var BasicClass = require('../../../../lib/basic-class');

var GmailThreadView = require('../gmail-thread-view');
var ElementMonitor = require('../../../../lib/dom/element-monitor');
var GmailElementGetter = require('../../gmail-element-getter');
var waitFor = require('../../../../lib/wait-for');

var StandardThreadViewMonitor = function(){
	BasicClass.call(this);

	this._setupMonitor();
};

StandardThreadViewMonitor.prototype = Object.create(BasicClass.prototype);

_.extend(StandardThreadViewMonitor.prototype, {

	__memberVariables: [
		{name: '_threadElementMonitor', destroy: true}
	],

	getThreadViewStream: function(){
		return this._threadElementMonitor.getViewAddedEventStream();
	},

	_setupMonitor: function(){
		this._threadElementMonitor = new ElementMonitor({

			elementMembershipTest: function(element){
				if(element.children.length !== 1){
					return false;
				}

				if(!element.children[0].classList.contains('g')){
					return false;
				}

				if(!element.children[0].classList.contains('id')){
					return false;
				}

				return true;
			},

			viewCreationFunction: function(element){
				return new GmailThreadView(element);
			}

		});


		var self = this;
		GmailElementGetter.waitForGmailModeToSettle().then(function(){
			waitFor(function(){
				return !!GmailElementGetter.getMainContentContainer();
			}).then(function(){
				var threadContainerElement = GmailElementGetter.getMainContentContainer();
				self._threadElementMonitor.setObservedElement(threadContainerElement);
			});
		});
	}

});

module.exports = StandardThreadViewMonitor;
