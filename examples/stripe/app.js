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
			var contact = contacts[i];
			getStripeCustomer(contact, sdk.User.getEmailAddress()).then(function(customer) {
				if (customer != null) {
					addStripeIndicatorToThreadRow(threadRowView, contact.emailAddress);
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
			var contact = contacts[i];
			if (seenSidebarEmails.get(threadView).indexOf(contact.emailAddress) != -1) {
				continue;
			}
			seenSidebarEmails.get(threadView).push(contact.emailAddress);


      getStripeCustomer(contact, sdk.User.getEmailAddress()).then(function(customer) {
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

    var invoices = results[0];
    var subscriptions = results[1];
    var html = results[2];


    transformCustomer(customer);
    transformSubscriptions(subscriptions);
    transformInvoices(invoices);
    var stats = createStats(customer, subscriptions, invoices);

    var template = _.template(html);
    sidebarForThread.get(threadView).innerHTML = sidebarForThread.get(threadView).innerHTML + template({
      customer: customer,
      invoices: invoices,
      subscriptions: subscriptions,
      stats: stats
    });
  });

}

function formatStripeCurrency(amount, digits) {
  return (amount/100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function transformCustomer(customer) {
  for (var i = 0; i < customer.sources.data.length; i++) {
    var source = customer.sources.data[i];
    source.imageUrl = chrome.runtime.getURL('cards/' + source.brand  + '.png');
  }
  customer.dashboardURL = "https://dashboard.stripe.com/customers/" + customer.id;
}

function transformSubscriptions(subscriptions) {
  _.sortBy(subscriptions.data, 'start');
  for (var i = 0; i < subscriptions.data.length; i++) {
    var sub = subscriptions.data[i];
    sub.discountedPrice = sub.plan.amount;
    if (sub.discount && sub.discount.coupon && sub.discount.coupon.valid) {
      if (sub.discount.coupon.amount_off) {
        sub.discountedPrice = sub.discountedPrice - sub.discount.coupon.amount_off;
      }
      else if (sub.discount.coupon.percent_off) {
        sub.discountedPrice = sub.discountedPrice * (100 - sub.discount.coupon.percent_off) / 100;
      }
    }
  }
}

function transformInvoices(invoices) {
  for (var i = 0; i < invoices.data.length; i++) {
    var inv = invoices.data[i];
    inv.imageUrl = inv.paid ? chrome.runtime.getURL('paid.png') : chrome.runtime.getURL('unpaid.png');
  }
}

function createStats(customer, subscriptions, invoices) {
  var retVal = {
    totalSpend: 0,
    currentMRR: (subscriptions.data ? subscriptions.data[0].discountedPrice : 0)
  };

  _.each(invoices.data, function(inv) {
    retVal.totalSpend += inv.total;
  });

  return retVal;
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

function getStripeCustomer(contact, currentUserEmail) {
	if (!cachedCustomerPromises[contact.emailAddress]) {
		if (contact.emailAddress.split("@")[1] === currentUserEmail.split("@")[1]) {
			cachedCustomerPromises[contact.emailAddress] = new Promise(function(resolve, reject) {
				resolve(null);
			});
		}
		else {
			cachedCustomerPromises[contact.emailAddress] = stripeGet('https://dashboard.stripe.com/ajax/proxy/api/v1/search', {count:20, query:contact.emailAddress})
			.then(function(result){
				for (var i = 0; i < result.data.length; i++) {
					if (result.data[i].object == "customer") {
						result.data[i].name = contact.name;
            return result.data[i];
					}
				}
				return null;
			});
		}
	}
	return cachedCustomerPromises[contact.emailAddress];
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
