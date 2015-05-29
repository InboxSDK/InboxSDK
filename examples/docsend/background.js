!function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","group","track","ready","alias","page","once","off","on"];analytics.factory=function(t){return function(){var e=Array.prototype.slice.call(arguments);e.unshift(t);analytics.push(e);return analytics}};for(var t=0;t<analytics.methods.length;t++){var e=analytics.methods[t];analytics[e]=analytics.factory(e)}analytics.load=function(t){var e=document.createElement("script");e.type="text/javascript";e.async=!0;e.src="https://cdn.segment.com/analytics.js/v1/"+t+"/analytics.min.js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(e,n)};analytics.SNIPPET_VERSION="3.0.1";
  
  if(DsApiBridge.BASE_URL.indexOf('localhost') > -1) {
    analytics.load("ekTSMDESAyU8Etk4ZwpPTOeGRKFr5nGJ"); // gmail_extension_test
  } else {
    analytics.load("F96a2rWzsNHYwJiQXuBZYMsR3fxeprCb"); // gmail_extension
  }
  analytics.page();
}}();

// TODO: This shit matches what's in segment.js. We should probz consolidate them!
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
   if (message.identify) {
    var user = message.identify;
    analytics.identify(user.id, {
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      company: user.company
    });

    $.ajax({
      type: 'post',
      url: 'https://api.intercom.io/users',
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", "Basic " + btoa(message.intercomApi));
      },
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify({
        user_id: user.id,
        created_at: Math.round(Date.parse(user.createdAt) / 1000),
        email: user.email,
        name: user.name
      })
    });
  } else if (message.track) {
    var event = 'chrext gm ' + message.track.event;
    analytics.track(event);
    $.ajax({
      type: 'post',
      url: 'https://api.intercom.io/events',
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", "Basic " + btoa(message.track.intercomApi));
      },
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify({
        event_name: event,
        created_at: Math.round(new Date().getTime()/1000.0),
        user_id: message.track.userId
      })
    });
  }
});
