var inboxSDK = new InboxSDK('toolbar-example');

inboxSDK.Toolbar.registerThreadViewButton({
	iconUrl: chrome.runtime.getURL('monkey.png'),
	section: 'ARCHIVE_GROUP',
	showFor: function(){
		return true;
	},
	onClick: function(){
		alert('whattup mofos!');
	}
});
