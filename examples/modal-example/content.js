'use strict';

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
	let el = div.cloneNode(true);
	el.style.backgroundColor = 'green';
	var modal = window._modal = sdk.Widgets.showModalView({
		el: el,
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
	let el = div.cloneNode(true);
	el.style.backgroundColor = 'blue';
	var modal = window._modal = sdk.Widgets.showModalView({
		el: el,
		buttons: [PRIMARY_BUTTON_OPTION]
	});

}

function showModal3(){
	let el = div.cloneNode(true);
	el.style.backgroundColor = 'orange';
	var modal = window._modal = sdk.Widgets.showModalView({
		el: el,
		chrome: false
	});

}

function showModal4(){
	let el = div.cloneNode(true);
	el.style.backgroundColor = 'yellow';
	var modal = window._modal = sdk.Widgets.showModalView({
		el: el,
		chrome: false,
		buttons: [PRIMARY_BUTTON_OPTION]
	});

}

function showModal5(){
	let el = div.cloneNode(true);
	el.style.backgroundColor = 'black';
	var modal = window._modal = sdk.Widgets.showModalView({
		el: el,
		chrome: false,
		showCloseButton: true
	});

}


function showModal6(){
	let el = div.cloneNode(true);
	el.style.backgroundColor = 'fuscia';
	var modal = window._modal = sdk.Widgets.showModalView({
		el: el,
		chrome: false,
		buttons: [PRIMARY_BUTTON_OPTION],
		showCloseButton: true
	});

	setTimeout(function(){
		modal.close();
	}, 5000);

}

function showModal7(){
	let el = div.cloneNode(true);
	el.style.backgroundColor = 'purple';
	var modal = window._modal = sdk.Widgets.showModalView({
		el: div,
		buttons: []
	});
}

function showDrawer1() {
	const el = document.createElement('div');
	el.style.height = '100%';
	el.innerHTML = 'foo <div style="height:100%;background:blue"> blah </div>';
	const drawer = window._drawer = sdk.Widgets.showDrawerView({el});
	drawer.on('slideAnimationDone', () => {
		console.log('slideAnimationDone');
	});
	drawer.on('closing', () => {
		console.log('closing');
	});
	drawer.on('destroy', () => {
		console.log('destroy');
		// simulating a real application unmounting a React component.
		// important that this happens after the drawer is already out of view.
		el.innerHTML = '';
	});
}
