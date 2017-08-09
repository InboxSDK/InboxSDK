'use strict';

InboxSDK.load(2, 'simple-example').then(function(inboxSDK) {
	let i = 0;

	window.makeMoleWidget = function() {
		const div = document.createElement('div');
		// div.style.width = '200px';
		// div.style.height = '400px';
		// div.style.backgroundColor = 'red';
		div.innerHTML = '<div class="streak__tasklist_mole"><div data-reactid=".0"><div class="streak__tasklist_mole_items" data-reactid=".0.0"></div><div class="streak__tasklist_mole_newItem" data-reactid=".0.$newTaskInput"><div class="streak__task_body" data-reactid=".0.$newTaskInput.0"><div class="streak__task_prefix" data-reactid=".0.$newTaskInput.0.0">+</div><div class="streak__task_title" style="display:inline-block;" data-reactid=".0.$newTaskInput.0.1"><div class="streak__gmailTextarea streak__gmailTextarea_textOnly streak__inputDecorator_gmailBorder"><div class="R5 streak__placeholder streak__gmailTextarea_multiLine" contenteditable="true" data-placeholder="New task (e.g. Follow up with ...)"></div></div></div><div class="streak__task_setdate_wrapper" style="display:inline-block;" data-reactid=".0.$newTaskInput.0.2"><div class="streak__taskListMoleButtonType" ><div class="reactMountPoint"><div><div data-reactid=".1"><div class="streak__task_setdate_outline" data-reactid=".1.0"><div class="streak__task_setdate" data-reactid=".1.0.0"></div></div></div></div></div></div></div></div></div><div class="streak__hide" data-reactid=".0.2"><div class="streak__collapsibleSection_header bbHand" data-reactid=".0.2.0"><span class="streak__collapsibleSection_header_arrow" data-reactid=".0.2.0.0">▾ </span><span data-reactid=".0.2.0.1">Completed Tasks</span></div><div class="" data-reactid=".0.2.1"></div></div></div></div>';

		const titleEl = document.createElement('div');
		titleEl.innerHTML = '<em>Foo</em> Bar';
		const minimizedTitleEl = document.createElement('div');
		minimizedTitleEl.innerHTML = '<em>Bar</em> Foo';
		const mole = inboxSDK.Widgets.showMoleView({
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

		// div.onclick = function() {
		// 	mole.close();
		// };

		mole.on('destroy', console.log.bind(console, 'mole destroy'));
		mole.on('minimize', console.log.bind(console, 'mole minimize'));
		mole.on('restore', console.log.bind(console, 'mole restore'));

		return mole;
	};

	window._mole = makeMoleWidget();


	window.makeChromelessMoleWidget = function(){
		const div = document.createElement('div');
		div.innerHTML = 'hello world';
		div.style.height = '500px';

		const mole = inboxSDK.Widgets.showMoleView({
			el: div,
			chrome: false
		});

		return mole;
	}

});
