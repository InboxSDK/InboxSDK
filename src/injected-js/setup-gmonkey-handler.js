const RSVP = require('rsvp');

module.exports = function(){
	const gmonkeyPromise = setupGmonkey();

	document.addEventListener('inboxSDKtellMeIsConversationViewDisabled', function() {
		gmonkeyPromise.then(gmonkey => {
			const answer = gmonkey.isConversationViewDisabled();
			const event = document.createEvent('CustomEvent');
			event.initCustomEvent('inboxSDKgmonkeyResponse', false, false, answer);
			document.dispatchEvent(event);
		});
	});

	document.addEventListener('inboxSDKtellMeCurrentThreadId', function(event) {
		var threadId;

		if(event.detail.isPreviewedThread){
			var rows = document.querySelectorAll('[gh=tl] tr.aps');
			if(rows.length > 0){
				threadId = rows[0].getAttribute('data-inboxsdk-threadid');
			}
		}
		else{
			threadId = window.gmonkey && window.gmonkey.v2 &&
				window.gmonkey.v2.getCurrentThread().getThreadId();
		}


	    if (threadId) {
	      event.target.setAttribute('data-inboxsdk-currentthreadid', threadId);
	    }
	 });
};

function setupGmonkey() {
	return new RSVP.Promise((resolve, reject) => {
		function check() {
			if (!window.gmonkey) {
				setTimeout(check, 500);
			} else {
				window.gmonkey.load("2.0", resolve);
			}
		}
		check();
	});
}
