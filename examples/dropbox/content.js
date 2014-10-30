var gmailSDK = new GmailSDK('dropbox');

var script = document.createElement('script');
script.id = 'dropboxjs';
script.setAttribute('data-app-key', '28gxvtpcvm1o19s');
script.type = 'text/data';

document.head.appendChild(script);

gmailSDK.Util.loadScript('https://www.dropbox.com/static/api/2/dropins.js').then(function() {

    gmailSDK.ComposeManager.registerComposeButtonCreator(function(e) {
        return {
            title: "Add Dropbox File",
            iconUrl: chrome.runtime.getURL('icon48.png'),
            onClick: function(event) {

            	Dropbox.choose({
            		success: function(files){
            			event.composeView.insertLinkIntoBody(files[0].name, files[0].link);
            		}
            	});

            }
        };
    });

});
