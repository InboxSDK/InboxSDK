InboxSDK.load(1, 'simple-example').then(function(inboxSDK) {
	var i = 0;

	window.makeMoleWidget = function() {
		var div = document.createElement('div');
		div.style.width = '200px';
		div.style.height = '400px';
		div.style.backgroundColor = 'red';

		var mole = inboxSDK.Widgets.showMoleView({
			el: div,
			title: 'Mole Example '+(++i)+' aaaaaa aaaaaa aaaaaa aaaaaa aaaaaa aaaaaa aaaaaa aaaaaa aaaaaa aaaaaa aaaaaa aaaaaa'
		});

		div.onclick = function() {
			mole.close();
		};
	};

	makeMoleWidget();
});
