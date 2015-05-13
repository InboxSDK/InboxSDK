var div = document.createElement('div');
div.style.width = '800px';
div.style.height = '400px';
div.style.backgroundColor = 'red';

InboxSDK.load(1, 'simple-example').then(function(inboxSDK) {

	//var modal = inboxSDK.Modal.show({
	var modal = inboxSDK.Widgets.showModalView({
		el: div,
		chrome: true,
		buttons: [
			{
				type: 'PRIMARY_BUTTON',
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
});
