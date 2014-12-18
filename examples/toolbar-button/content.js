var inboxSDK = new InboxSDK('toolbar-example');

inboxSDK.Toolbars.registerThreadViewButton({
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


inboxSDK.Toolbars.registerThreadListWithSelectionsButton({
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


inboxSDK.Toolbars.registerThreadListNoSelectionsButton({
	iconUrl: chrome.runtime.getURL('monkey.png'),
	title: 'Monkeys 3',
	section: 'CHECKBOX_GROUP',
	showFor: function(){
		return true;
	},
	onClick: function(){
		alert('hi monkeys 3');
	}
});
