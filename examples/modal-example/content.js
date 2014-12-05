var div = document.createElement('div');
div.style.width = '800px';
div.style.height = '400px';
div.style.backgroundColor = 'red';

var modal = (new InboxSDK('simple-example')).Modal.show({
	el: div,
	chrome: true,
	buttons: [
		{
			type: 'PRIMARY_BUTTON',
			text: 'Monkeys',
			onClick: function(){
				modal.close();
			},
			orderHin: 5
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
