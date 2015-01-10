if (window.top !== window) {
	throw new Error('not in top frame');
}

InboxSDK.load(1, 'dropbox').then(function(inboxSDK) {
	/* var script = document.createElement('script');
	script.id = 'dropboxjs';
	script.setAttribute('data-app-key', '28gxvtpcvm1o19s');
	script.type = 'text/data';

	document.head.appendChild(script);

	inboxSDK.Util.loadScript('https://www.dropbox.com/static/api/2/dropins.js').then(function() { */

	    inboxSDK.Views.on('composeOpen', function(composeView) {
	    	composeView.addButton({
	            title: "Add Dropbox File",
	            iconUrl: safari.extension.baseURI + 'images/icon48.png',
	            onClick: function() {

	            	Dropbox.choose({
	            		success: function(files){
	            			composeView.insertLinkIntoBody(files[0].name, files[0].link);
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
				iconUrl: safari.extension.baseURI + 'images/action19.png',
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
				iconUrl: safari.extension.baseURI + 'images/action19.png',
				tooltip: 'Save to Dropbox',
				callback: function(){
					alert('not yet available - contact email-feedback@dropbox.com if you want this to work');
					return;
				}
			});
		});
	/*
	});
	*/


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
			downloadUrl: getDownloadUrl(link.href),
			fileIconImageUrl: safari.extension.baseURI + 'images/action38.png',
			documentPreviewImageUrl: safari.extension.baseURI + 'images/icon128.png',
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

});
