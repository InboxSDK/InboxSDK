InboxSDK.load(2, 'sidebar-contact-example').then(function(sdk){
	window._sdk = sdk;

	sdk.Conversations.registerMessageViewHandlerAll(function(messageView) {
		console.log('messageView all, loaded', messageView.isLoaded(), messageView);
	});

	sdk.Conversations.registerMessageViewHandler(function(messageView) {
		console.log('messageView id', messageView.getMessageID(), messageView);
	});

	sdk.Conversations.registerThreadViewHandler(function(threadView){
		console.log('threadView id', threadView.getThreadID(), threadView.getMessageViewsAll().length, threadView.getMessageViews().length);

		var messages = threadView.getMessageViewsAll();
		messages.forEach(function(message) {
			//console.log(message, message.isLoaded(), message.getViewState(), message.isLoaded() && message.getMessageID(), message.isLoaded() && message.getBodyElement());
		});
		var lastMessage = messages[messages.length - 1];

		var sender = lastMessage.getSender();

		var el = document.createElement("div");
		el.textContent = "Hi, " + sender.name + ' <' + sender.emailAddress + '>';

		threadView.addSidebarContentPanel({
			title: 'Contact',
			el: el,
			orderHint: 1
		});


		threadView.on('contactHover', function(event){
			var contact = event.contact;
			console.log(contact);
			el.textContent = "Hi, " + contact.name + ' <' + contact.emailAddress + '>';
		});

	});

	var el = document.createElement("div");
	el.classList.add('clearbit-connect');
	el.innerHTML = `
		<div class="sidebar-component" data-reactid=".0"><div class="dropdown-component" data-reactid=".0.0"><a class="trigger" data-reactid=".0.0.0"><span class="cb-icon-context" data-reactid=".0.0.0.0"></span></a><div class="menu" data-reactid=".0.0.1"><ul data-reactid=".0.0.1.0"><li data-reactid=".0.0.1.0.0"><a data-reactid=".0.0.1.0.0.0">Invite to Connect</a></li><li data-reactid=".0.0.1.0.1"><a data-reactid=".0.0.1.0.1.0">Bad person data?</a></li><li data-reactid=".0.0.1.0.2"><a data-reactid=".0.0.1.0.2.0">Bad company data?</a></li></ul><div class="invited-message" data-reactid=".0.0.1.1">Successfully invited!</div></div></div><div class="person-component" data-reactid=".0.1"><header class="row" data-reactid=".0.1.0"><div class="avatar" data-reactid=".0.1.0.0"><div class="default-image" data-reactid=".0.1.0.0.0"></div></div><div class="col" data-reactid=".0.1.0.1"><h2 data-reactid=".0.1.0.1.0">Chris Cowan</h2></div></header></div><div class="company-component" data-reactid=".0.2"><header class="row" data-reactid=".0.2.0"><div class="logo" data-reactid=".0.2.0.0"><img src="https://logo.clearbit.com/github.com?s=50" data-reactid=".0.2.0.0.0"></div><div class="col" data-reactid=".0.2.0.1"><h2 title="GitHub" data-reactid=".0.2.0.1.0">GitHub</h2><h3 title="github.com" data-reactid=".0.2.0.1.1"><a href="http://github.com" data-reactid=".0.2.0.1.1.0">github.com</a></h3></div></header><article data-reactid=".0.2.1"><div class="description" title="GitHub is where people build software. More than 22 million people use GitHub to discover, fork, and contribute to over 61 million projects." data-reactid=".0.2.1.0">GitHub is where people build software. More than 22 million people use GitHub...</div><div class="location" data-reactid=".0.2.1.1">San Francisco, CA 94107, USA</div><div class="phone" data-reactid=".0.2.1.2"><a href="tel:+1 415-448-6673" data-reactid=".0.2.1.2.0">+1 415-448-6673</a></div><ul data-reactid=".0.2.1.3"><li data-reactid=".0.2.1.3.0"><i data-reactid=".0.2.1.3.0.0">Employees</i><span data-reactid=".0.2.1.3.0.1"> </span><span data-reactid=".0.2.1.3.0.2">629</span></li><li data-reactid=".0.2.1.3.3"><i data-reactid=".0.2.1.3.3.0">Type</i><span data-reactid=".0.2.1.3.3.1"> </span><span data-reactid=".0.2.1.3.3.2">Private</span></li><li data-reactid=".0.2.1.3.4"><i data-reactid=".0.2.1.3.4.0">Funding</i><span data-reactid=".0.2.1.3.4.1"> </span><span data-reactid=".0.2.1.3.4.2">350M</span></li><li data-reactid=".0.2.1.3.5"><i data-reactid=".0.2.1.3.5.0">Tags</i><span data-reactid=".0.2.1.3.5.1"> </span><span data-reactid=".0.2.1.3.5.2">Software, Information Technology &amp; Services, Technology, SAAS, B2C, B2B</span></li></ul><div class="social-icons-component" data-reactid=".0.2.1.4"><div class="twitter-dropdown-component" data-reactid=".0.2.1.4.0"><div class="header" data-reactid=".0.2.1.4.0.0"><a title="https://twitter.com/github" data-reactid=".0.2.1.4.0.0.0"><span class="cb-icon-twitter" data-reactid=".0.2.1.4.0.0.0.0"></span></a></div></div><a target="_blank" href="https://facebook.com/github" data-reactid=".0.2.1.4.1"><span class="cb-icon cb-icon-facebook" data-reactid=".0.2.1.4.1.0"></span></a><a target="_blank" href="https://crunchbase.com/organization/github" data-reactid=".0.2.1.4.4"><span class="cb-icon cb-icon-crunchbase" data-reactid=".0.2.1.4.4.0"></span></a></div></article></div></div>
	`;

	sdk.Global.addSidebarContentPanel({
		appName: 'Global Monkey',
		appIconUrl: chrome.runtime.getURL('monkey.jpg'),
		el: el,
		orderHint: 2
	}).then(p => window.globalCP = p);

});
