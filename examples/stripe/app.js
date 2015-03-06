var cachedCustomerPromises = {};

var seenSidebarEmails = new WeakMap();
var emailsAddedToSidebar = new WeakMap();
var sidebarForThread = new WeakMap();

var stripeInfoPromise = null;

var templateHtmlPromise = null;

Promise.all([
  InboxSDK.load('1', 'stripe'),
  InboxSDK.loadScript('https://code.jquery.com/jquery-2.1.3.min.js'),
  InboxSDK.loadScript('https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.2/underscore-min.js')
])
.then(function(results){
  var sdk = results[0];
	stripeInfoPromise = getStripeInfo();

	sdk.Lists.registerThreadRowViewHandler(function(threadRowView) {
		var contacts = threadRowView.getContacts();
		for (var i = 0; i < contacts.length; i++) {
			var email = contacts[i].emailAddress;
			getStripeCustomer(email, sdk.User.getEmailAddress()).then(function(customer) {
				if (customer != null) {
					addStripeIndicatorToThreadRow(threadRowView, email);
				}
			});
		}
	});

	sdk.Conversations.registerMessageViewHandler(function(messageView) {
		var threadView = messageView.getThreadView();
		if (!seenSidebarEmails.has(threadView)) {
			seenSidebarEmails.set(threadView, []);
		}

		if (!emailsAddedToSidebar.has(threadView)) {
			emailsAddedToSidebar.set(threadView, []);
		}

		var contacts = messageView.getRecipients();
		contacts.push(messageView.getSender());

		for (var i = 0; i < contacts.length; i++) {
			var email = contacts[i].emailAddress;
			if (seenSidebarEmails.get(threadView).indexOf(email) != -1) {
				continue;
			}
			seenSidebarEmails.get(threadView).push(email);


      getStripeCustomer(email, sdk.User.getEmailAddress()).then(function(customer) {
				if (customer != null) {
          addStripeSidebar(threadView, customer);
				}
			});
		}
	});

});


function addStripeSidebar(threadView, customer) {
	if (emailsAddedToSidebar.get(threadView).indexOf(customer.email) != -1) {
		return;
	}

	if (!sidebarForThread.has(threadView)) {
		sidebarForThread.set(threadView, document.createElement('div'));

		threadView.addSidebarContentPanel({
			el: sidebarForThread.get(threadView),
			title: "Stripe Customers",
			iconUrl: chrome.runtime.getURL('stripe.png')
		});
	}

  if (!templateHtmlPromise) {
    templateHtmlPromise = get(chrome.runtime.getURL('templates.html'), null, null);
  }

  Promise.all([
    stripeGet("https://dashboard.stripe.com/ajax/proxy/api/v1/invoices", {customer: customer.id, count: 50, limit: 50}),
    stripeGet("https://dashboard.stripe.com/ajax/proxy/api/v1/customers/" + customer.id + "/subscriptions", {count: 50, limit: 50}),
    templateHtmlPromise
  ])
  .then(function(results) {
    console.log(results);
    var template = _.template(results[2]);
    sidebarForThread.get(threadView).innerHTML = sidebarForThread.get(threadView).innerHTML + template({customer: customer, invoices: results[0], subscriptions: results[1]});
  });




}

function addStripeIndicatorToThreadRow(threadRowView, email) {
	threadRowView.addImage({
		imageUrl: chrome.runtime.getURL('stripe.png'),
		tooltip: email,
    imageClass: "rounded_stripe"
	});
}

function get(url, params, headers) {
	return Promise.resolve(
		$.ajax({
			url: url,
			type: "GET",
			data: params,
			headers: headers
		})
	);
}

function stripeGet(url, params) {
	return stripeInfoPromise.then(function(info) {
		var headers = {
			"Authorization": ("Bearer " + info.session_api_key),
			"x-stripe-livemode": true
		};
		return get(url, params, headers);
	});
}

function getStripeCustomer(email, currentUserEmail) {
	if (!cachedCustomerPromises[email]) {
		if (email.split("@")[1] === currentUserEmail.split("@")[1]) {
			cachedCustomerPromises[email] = new Promise(function(resolve, reject) {
				resolve(null);
			});
		}
		else {
			cachedCustomerPromises[email] = stripeGet('https://dashboard.stripe.com/ajax/proxy/api/v1/search', {count:20, query:email})
			.then(function(result){
				for (var i = 0; i < result.data.length; i++) {
					if (result.data[i].object == "customer") {
						return result.data[i];
					}
				}
				return null;
			});
		}
	}
	return cachedCustomerPromises[email];
}

function getStripeInfo() {
	return get('https://dashboard.stripe.com/dashboard', {}).then(function(response){
		var e1 = document.createElement("div"), e2 = document.createElement("div");
    e1.innerHTML = response;
    e2.innerHTML = e1.querySelector('#preloaded_json').text;
  	return JSON.parse(e2.textContent);
	});
}


function gravatarUrl (email, size, defaultImage)
{
  var url = "https://secure.gravatar.com/avatar/" + md5(email.toLowerCase().trim()) + "?size=" + size;
  if (default_image) {
    url += "&default=" + encodeURIComponent(default_image);
  }
  return url;
}
