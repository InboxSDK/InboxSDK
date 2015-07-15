'use strict';

export default function(gmailComposeView, recipientRowOptionStream){
	let row;

	recipientRowOptionStream
		.takeUntil(gmailComposeView.getEventStream().filter(false).mapEnd())
		.onValue((options) => {
			if(row){
				row.remove();
				row = null;
			}

			if(options) {
				row = _createRecipientRowElement(gmailComposeView, options);
			}
			gmailComposeView.getElement().dispatchEvent(new CustomEvent('resize', {
				bubbles: false, cancelable: false, detail: null
			}));
		});

	return () => {
		if (row) {
			row.remove();
			gmailComposeView.getElement().dispatchEvent(new CustomEvent('resize', {
				bubbles: false, cancelable: false, detail: null
			}));
		}
	};
}

function _createRecipientRowElement(gmailComposeView, options){

	let row = document.createElement('tr');
	let labelTD = document.createElement('td');
	let contentTD = document.createElement('td');

	row.appendChild(labelTD);
	row.appendChild(contentTD);

	row.setAttribute('class', 'inboxsdk__recipient_row');

	if(options.labelText){
		labelTD.setAttribute('class', 'ok');

		let span = document.createElement('span');
		span.setAttribute('class', 'gO');

		labelTD.appendChild(span);
		span.textContent = options.labelText;
	}

	if(options.el){
		contentTD.setAttribute('class', 'az3');
		contentTD.appendChild(options.el);
	}

	gmailComposeView.getRecipientRowElements()[0].insertAdjacentElement('afterend', row);

	return row;
}
