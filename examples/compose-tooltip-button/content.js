InboxSDK.load(1, 'simple-example', {inboxBeta:true}).then(function(inboxSDK) {
	inboxSDK.Compose.registerComposeViewHandler(function(composeView){

		window.composeView = composeView;

		var button = composeView.addButton({
			title: 'Monkeys!',
			iconUrl: chrome.runtime.getURL('monkey.png'),
			hasDropdown: true,
			onClick: function(event){
				event.dropdown.el.innerHTML = 'hello world!';
				event.dropdown.el.addEventListener('click', function() {
					console.log('selection', composeView.getSelectedBodyText());
				});
			},
			section: 'TRAY_LEFT'
		});

		var button2 = composeView.addButton({
			title: 'Monkeys 2',
			iconUrl: chrome.runtime.getURL('monkey.png'),
			onClick: function(event){
			},
			section: 'TRAY_LEFT'
		});

		button.showTooltip({
			imageUrl: chrome.runtime.getURL('partycat.jpg'),
			title: 'Monkeys Rule!',
			subtitle: 'the jungle',
			button: {
				title: 'Party!',
				onClick: function(){
					var div = document.createElement('div');
					div.innerHTML = 'Hello World!';
					button2.showTooltip({
						el: div
					});

					setTimeout(function(){button2.closeTooltip();}, 5*1000);
				}
			}
		});

	});
});
