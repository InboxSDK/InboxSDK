var div = document.createElement('div');
div.style.width = '800px';
div.style.height = '400px';
div.style.backgroundColor = 'red';

var sdk;

InboxSDK.load(1, 'modal-example', {inboxBeta:true}).then(function(inboxSDK) {
	window.sdk = sdk = inboxSDK;
});

var PRIMARY_BUTTON_OPTION = {
	type: 'PRIMARY_ACTION',
	text: 'Monkeys',
	onClick: function(e){
		e.modalView.close();
	},
	orderHint: 5
};

function showModal1(){
	var modal = window._modal = sdk.Widgets.showModalView({
		el: div,
		chrome: true,
		buttons: [
			PRIMARY_BUTTON_OPTION,
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
}

function showModal2(){

	var modal = window._modal = sdk.Widgets.showModalView({
		el: div,
		buttons: [PRIMARY_BUTTON_OPTION]
	});

}

function showModal3(){

	var modal = window._modal = sdk.Widgets.showModalView({
		el: div,
		chrome: false
	});

}

function showModal4(){

	var modal = window._modal = sdk.Widgets.showModalView({
		el: div,
		chrome: false,
		buttons: [PRIMARY_BUTTON_OPTION]
	});

}

function showModal5(){

	var modal = window._modal = sdk.Widgets.showModalView({
		el: div,
		chrome: false,
		showCloseButton: true
	});

}


function showModal6(){

	var modal = window._modal = sdk.Widgets.showModalView({
		el: div,
		chrome: false,
		buttons: [PRIMARY_BUTTON_OPTION],
		showCloseButton: true
	});

}

function showModal7(){

	var modal = window._modal = sdk.Widgets.showModalView({
		el: div,
		buttons: []
	});

}
