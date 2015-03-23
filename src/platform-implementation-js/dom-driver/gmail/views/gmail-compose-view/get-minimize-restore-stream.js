const _ = require('lodash');
const makeMutationObserverStream = require('../../../../lib/dom/make-mutation-observer-stream');

function getMinimizeRestoreStream(gmailComposeView){

	const element = gmailComposeView.getElement();
	const bodyElement = gmailComposeView.getBodyElement();
	const bodyContainer = _.find(element.children, child => child.contains(bodyElement));
	const heightChanger = gmailComposeView.getElement().querySelector('.aoI');


	const heightChangerStream = makeMutationObserverStream(heightChanger, {attributes: true, attributeFilter: ['style']});

	heightChangerStream
		.filter(() => heightChanger.style.height === '0px')
		.onValue(() => heightChanger.style.height = '');

	return heightChangerStream
			.map(() => heightChanger.style.height === '' ? true : false) //true = isMinimized
			.merge(
				makeMutationObserverStream(bodyContainer, {attributes: true, attributeFilter: ['style']})
					.map(() => bodyContainer.style.display === '' ? false : true)
			)
			.map(
				(isMinimized) => isMinimized ?
					{eventName: 'minimized'} :
					{eventName: 'restored'}
			)
			.throttle(10, {leading: true});



}

module.exports = getMinimizeRestoreStream;
