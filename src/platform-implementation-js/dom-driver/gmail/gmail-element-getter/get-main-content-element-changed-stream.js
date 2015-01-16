var _ = require('lodash');
var Bacon = require('baconjs');

var streamWaitFor = require('../../../lib/stream-wait-for');
var makeMutationObserverStream = require('../../../lib/dom/make-mutation-observer-stream');


function getMainContentElementChangedStream(GmailElementGetter){
	return waitForMainContentContainer(GmailElementGetter)
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
							.flatMap(function(mainNode){
								return makeMutationObserverStream(mainNode, {attributes: true, attributeFilter: ['role'], attributeOldValue: true})
											.startWith({
												oldValue: null,
												target: mainNode
											})
											.filter(_isNowMain)
											.map('.target');
							});

				});
}

function waitForMainContentContainer(GmailElementGetter){
	return streamWaitFor(function(){
		return !!GmailElementGetter.getMainContentContainer();
	});
}

function _isNowMain(mutation){
	var oldValue = mutation.oldValue;
	var newValue = mutation.target.getAttribute('role');

	if(!oldValue && newValue === 'main'){
		return true;
	}
}


module.exports = getMainContentElementChangedStream;
