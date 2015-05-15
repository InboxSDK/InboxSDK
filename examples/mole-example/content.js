InboxSDK.load(1, 'simple-example').then(function(inboxSDK) {
	var i = 0;

	window.makeMoleWidget = function() {
		var div = document.createElement('div');
		div.style.width = '200px';
		div.style.height = '400px';
		div.style.backgroundColor = 'red';

		var mole = inboxSDK.Widgets.showMoleView({
			el: div,
			title: 'Mole Example '+(++i)
		});

		div.onclick = function() {
			mole.close();
		};

		mole.on('destroy', console.log.bind(console, 'mole destroy'));
		mole.on('minimize', console.log.bind(console, 'mole minimize'));
		mole.on('restore', console.log.bind(console, 'mole restore'));
	};

	makeMoleWidget();
});
