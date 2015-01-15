InboxSDK.load(1, 'toolbar-example').then(function(inboxSDK) {

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
			console.log(event);
		}
	});


	inboxSDK.Toolbars.registerThreadListWithSelectionsButton({
		iconUrl: chrome.runtime.getURL('monkey.png'),
		title: 'Monkeys 2',
		section: 'ARCHIVE_GROUP',
		showFor: function(){
			return true;
		},
		onClick: function(event){
			event.selectedThreadRowViews.forEach(function(threadRowView){
				threadRowView.getContacts().forEach(function(contact){
					threadRowView.addLabel({
						title: contact.emailAddress
					});
				});
			});
		}
	});

});
