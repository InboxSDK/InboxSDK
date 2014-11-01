var _ = require('lodash');
var BasicClass = require('../../../../lib/basic-class');

var GmailThreadView = require('../gmail-thread-view');
var ElementMonitor = require('../../../../lib/dom/element-monitor');
var GmailElementGetter = require('../../gmail-element-getter');
var waitFor = require('../../../../lib/wait-for');

var PreviewPaneThreadViewMonitor = function(){
	BasicClass.call(this);

	this._setupMonitor();
};

PreviewPaneThreadViewMonitor.prototype = Object.create(BasicClass.prototype);

_.extend(PreviewPaneThreadViewMonitor.prototype, {

	__memberVariables: [
		{name: '_mainContentMutationObserver', destroy: true},
		{name: '_threadContentElementMonitor', destroy: true}
	],

	getThreadViewStream: function(){
		return this._threadContentElementMonitor.getViewAddedEventStream();
	},

	_setupMonitor: function(){
		this._mainContentMutationObserver = new MutationObserver(this._handleNewMainContentElement.bind(this));

		var self = this;
		waitFor(function(){
			return !!GmailElementGetter.getMainContentContainer();
		}).then(function(){
			var observedElement = GmailElementGetter.getMainContentContainer();

			self._mainContentMutationObserver.observe(
				observedElement,
				{childList: true}
			);

			var children = observedElement.children;
			Array.prototype.forEach.call(children, function(childElement){
				self._handleNewMainContentElement(childElement);
			});
		});

		this._threadContentElementMonitor = new ElementMonitor({

			elementMembershipTest: function(element){
				if(!element.querySelector('.if')){
					return false;
				}

				return true;
			},

			viewCreationFunction: function(element){
				var threadRoot = element.querySelector('.if');
				return new GmailThreadView(threadRoot);
			}

		});
	},

	_handleNewMainContentElement: function(mutations){
		var self = this;
		mutations.forEach(function(mutation){
			Array.prototype.forEach.call(mutation.addedNodes, function(addedNode){
				self._handleNewMainContentElement(addedNode);
			});
		});
	},

	_handleNewMainContentElement: function(element){
		if(!this._hasThreadList(element)){
			return;
		}

		var threadContentWrapperElement = this._getThreadContentWrapperElement(element);

		this._threadContentElementMonitor.setObservedElement(threadContentWrapperElement);
	},

	_hasThreadList: function(element){
		return !!this._getThreadContentWrapperElement(element);
	},

	_getThreadContentWrapperElement: function(element){
		return element && element.querySelector && element.querySelector('table.Bs > tr');
	}

});

module.exports = PreviewPaneThreadViewMonitor;
