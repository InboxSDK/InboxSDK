module.exports = function(){
	setupGmonkey();

	document.addEventListener('inboxSDKtellMeCurrentThreadId', function(event) {
	    var threadId = window.gmonkey && window.gmonkey.v2 &&
				window.gmonkey.v2.getCurrentThread().getThreadId();
	    if (threadId) {
	      event.target.setAttribute('data-inboxsdk-currentthreadid', threadId);
	    }
	 });
};


function setupGmonkey(){
	if(!window.gmonkey){
		setTimeout(setupGmonkey, 500);
		return;
	}

	window.gmonkey.load("2.0", function(){});
}
