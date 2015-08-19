var div = document.createElement('div');
div.style.width = '800px';
div.style.height = '400px';
div.style.backgroundColor = 'red';

InboxSDK.load(1, 'modal-example', {inboxBeta:true}).then(function(inboxSDK) {

	window._sdk = inboxSDK;
	inboxSDK.Compose.registerComposeViewHandler(function(composeView) {
		var modal = window._modal = inboxSDK.Widgets.showModalView({
			el: div,
			chrome: true,
			buttons: [
				{
					type: 'PRIMARY_ACTION',
					text: 'Monkeys',
					onClick: function(){
						modal.close();
					},
					orderHint: 5
				},
				{
					text: 'Monkeys 2',
					onClick: function(){
						alert('bye');
					},
					orderHint: 10
				},
				{
					text: 'Monkeys 3',
					onClick: function(){
						alert('bye');
					},
					orderHint: 0
				}
			]
		});
		modal.on('destroy', function() {
			console.log('modal destroy');
		});
	});
});
