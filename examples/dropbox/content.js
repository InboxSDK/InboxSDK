var inboxSDK = new InboxSDK('dropbox');

var script = document.createElement('script');
script.id = 'dropboxjs';
script.setAttribute('data-app-key', '28gxvtpcvm1o19s');
script.type = 'text/data';

document.head.appendChild(script);

inboxSDK.Util.loadScript('https://www.dropbox.com/static/api/2/dropins.js').then(function() {

    inboxSDK.Views.on('composeOpen', function(composeView) {
    	composeView.addButton({
            title: "Add Dropbox File",
            iconUrl: chrome.runtime.getURL('images/icon48.png'),
            onClick: function() {

            	Dropbox.choose({
            		success: function(files){
            			composeView.insertLinkChipIntoBody({
							text: files[0].name,
							url: files[0].link,
							iconUrl: ''
						});
            		}
            	});

            }
        });
    });


	inboxSDK.Views.on('messageOpen', function(messageView){
		var links = messageView.getLinks();

		links.forEach(function(link){
			if(isEligibleLink(link)){
				addAttachmentCard(messageView, link);
			}
		});


		messageView.addButtonToDownloadAllArea({
			iconUrl: chrome.runtime.getURL('images/action19.png'),
			tooltip: 'Save all to Dropbox',
			callback: function(attachmentCards){

				alert('not yet available - contact email-feedback@dropbox.com if you want this to work');
				return;

			}
		});
	});


	inboxSDK.Views.on('attachmentCardOpen', function(attachmentCardView){
		if(!attachmentCardView.isStandardAttachment()){
			return;
		}

		attachmentCardView.addButton({
			iconUrl: chrome.runtime.getURL('images/action19.png'),
			tooltip: 'Save to Dropbox',
			callback: function(){
				alert('not yet available - contact email-feedback@dropbox.com if you want this to work');
				return;
			}
		});
	});

});



function isEligibleLink(link){
	if((link.href.indexOf('dropbox.com/s/') === -1 && link.href.indexOf('dropbox.com/sh/') === -1) || link.isInQuotedArea){
		return false;
	}

	return true;
}


function addAttachmentCard(messageView, link){
	var parts = link.href.split('/');
	var lastPart = parts[parts.length - 1];

	var fileName = decodeURIComponent(lastPart.replace(/(.*?)\?.*/, '$1'));

	messageView.addAttachmentCard({
		fileName: fileName,
		previewUrl: link.href,
		fileIconImageUrl: chrome.runtime.getURL('images/action38.png'),
		documentPreviewImageUrl: chrome.runtime.getURL('images/icon128.png'),
        buttons: [
            {
                tooltip: 'Download file',
                iconUrl: chrome.runtime.getURL('images/action38.png'),
                onClick: function(){
                    location.href = getDownloadUrl(link.href);
                }
            }
        ],
		color: 'RGB(21, 129, 226)',
		callback: function(eventName){
			console.log(eventName);
		}
	});
}

function getDownloadUrl(url){
	if(url.indexOf('?') === -1){
		url += '?';
	}

	if(url.indexOf('dl=') === -1){
		url += 'dl=1';
	}
	else if(url.indexOf('dl=0')){
		url = url.replace('dl=0', 'dl=1');
	}

	return url;
}
