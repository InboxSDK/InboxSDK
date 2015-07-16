InboxSDK.load(1, 'simple-example').then(function(inboxSDK) {
	var i = 0;

	window.makeMoleWidget = function() {
		var div = document.createElement('div');
		div.style.width = '200px';
		div.style.height = '400px';
		div.style.backgroundColor = 'red';

		var titleEl = document.createElement('div');
		titleEl.innerHTML = '<em>Foo</em> Bar';
		var minimizedTitleEl = document.createElement('div');
		minimizedTitleEl.innerHTML = '<em>Bar</em> Foo';
		var mole = inboxSDK.Widgets.showMoleView({
			el: div,
			className: 'foobartest',
			title: 'Mole Example '+(++i),
			//titleEl: titleEl,
			minimizedTitleEl: minimizedTitleEl,
			titleButtons: [
				{
					title: 'a1',
					iconUrl:'https://mailfoogae.appspot.com/build/images/snoozeIcon.png',
					onClick: function() {
						console.log('click a1');
					}
				},
				{
					title: 'a2',
					iconUrl:'https://mailfoogae.appspot.com/build/images/boxIconOnNewCompose.png',
					onClick: function() {
						console.log('click a2');
					}
				}
			]
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
