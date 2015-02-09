var _ = require('lodash');
var Bacon = require('baconjs');

var streamWaitFor = require('../../../lib/stream-wait-for');
var makeMutationObserverStream = require('../../../lib/dom/make-mutation-observer-stream');
var dispatchCustomEvent = require('../../../lib/dom/dispatch-custom-event');


function getMainContentElementChangedStream(GmailElementGetter){
	setupChildRemovalNotifier(GmailElementGetter);
	return createMainChangeStream(GmailElementGetter);
}

function waitForMainContentContainer(GmailElementGetter){
	return streamWaitFor(function(){
		return !!GmailElementGetter.getMainContentContainer();
	});
}

function createMainChangeStream(GmailElementGetter){
	return  waitForMainContentContainer(GmailElementGetter)
			.flatMap(function(){
				return makeMutationObserverStream(GmailElementGetter.getMainContentContainer(), {childList: true})
							.filter(function(mutation){
								return mutation.removedNodes.length === 0 && mutation.addedNodes.length > 0;
							})
							.map('.addedNodes')
							.flatMap(function(addedNodes){
								return Bacon.fromArray(_.toArray(addedNodes));
							})
							.merge(Bacon.fromArray(_.toArray(GmailElementGetter.getMainContentContainer().children)))
							.filter(function(node){
								return node.classList.contains('nH');
							})
							.flatMap(_monitorForMainAttributeStream)
			});
}

function _monitorForMainAttributeStream(mainNode){
	var mainAttributeStream = makeMutationObserverStream(
								mainNode,
								{
									attributes: true,
									attributeFilter: ['role'],
									attributeOldValue: true
								}
							)
							.startWith({
								oldValue: null,
								target: mainNode
							})
							.toProperty();

	//setup not main notifier
	mainAttributeStream
		.filter(_isNowNotMain)
		.map('.target')
		.onValue((node) => {dispatchCustomEvent(node, 'nowNotMain');});



	//main notifier
	return mainAttributeStream
			.filter(_isNowMain)
			.map('.target')
			.doAction((node) => {dispatchCustomEvent(node, 'nowMain');})
}

function _isNowNotMain(mutation){
	var oldValue = mutation.oldValue;
	var newValue = mutation.target.getAttribute('role');

	if(!newValue && oldValue === 'main'){
		return true;
	}
}


function _isNowMain(mutation){
	var oldValue = mutation.oldValue;
	var newValue = mutation.target.getAttribute('role');

	if(!oldValue && newValue === 'main'){
		return true;
	}
}

function setupChildRemovalNotifier(GmailElementGetter){
	waitForMainContentContainer(GmailElementGetter)
		.flatMap(function(){
			return makeMutationObserverStream(GmailElementGetter.getMainContentContainer(), {childList: true})
					.filter((mutation) => {
						return mutation.removedNodes.length > 0 && mutation.addedNodes.length === 0;
					})
					.map('.removedNodes')
					.flatMap(removedNodes => { return Bacon.fromArray(_.toArray(removedNodes))})
					.filter(node => { return node.classList.contains('nH') })
		})
		.onValue(node => { dispatchCustomEvent(node, 'removed') });

}


module.exports = getMainContentElementChangedStream;
