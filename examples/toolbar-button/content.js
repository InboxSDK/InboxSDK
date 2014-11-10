var inboxSDK = new InboxSDK('toolbar-example');

inboxSDK.Toolbar.registerThreadViewButton({
	iconUrl: chrome.runtime.getURL('monkey.png'),
	title: 'Monkeys',
	section: 'MOVE_GROUP',
	showFor: function(){
		return true;
	},
	hasDropdown: true,
	onClick: function(event){
		event.dropdown.el.innerHTML = 'Hello monkey world!';
	}
});


inboxSDK.Toolbar.registerThreadListWithSelectionsButton({
	iconUrl: chrome.runtime.getURL('monkey.png'),
	title: 'Monkeys 2',
	section: 'ARCHIVE_GROUP',
	showFor: function(){
		return true;
	},
	onClick: function(){
		alert('hi monkeys 2');
	}
});
