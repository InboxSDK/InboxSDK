var inboxSDK = new InboxSDK('dropbox');

// dropins.js looks for a script element on the page DOM to get the app key, so
// oblige it. The loadScript() call later doesn't add a script element to the
// page for it since that wouldn't get executed in the extension's context.
var script = document.createElement('script');
script.id = 'dropboxjs';
script.setAttribute('data-app-key', '28gxvtpcvm1o19s');
script.type = 'text/data';
document.head.appendChild(script);

inboxSDK.Util.loadScript('https://www.dropbox.com/static/api/2/dropins.js').then(function() {
  inboxSDK.Compose.registerComposeViewHandler(function(composeView) {
    composeView.addButton({
      title: "Add Dropbox File",
      iconUrl: chrome.runtime.getURL('images/icon48.png'),
      type: 'MODIFIER',
      onClick: function() {
        var hasSelectedText = !!composeView.getSelectedBodyText();

        Dropbox.choose({
          success: function(files) {
            if (hasSelectedText) {
              composeView.insertLinkIntoBodyAtCursor(files[0].name, files[0].link);
            } else {
              composeView.insertLinkChipIntoBodyAtCursor(
                  files[0].name,
                  files[0].link,
                  'https://dt8kf6553cww8.cloudfront.net/static/images/icons/blue_dropbox_glyph-vflJ8-C5d.png'
              );
            }
          }
        });

      }
    });
  });

  inboxSDK.Conversations.registerMessageViewHandler(function(messageView) {
    var links = messageView.getLinks();

    links.filter(isEligibleLink).forEach(function(link) {
      addCustomAttachmentCard(messageView, link);
    });

    messageView.addButtonToDownloadAllArea({
      iconUrl: chrome.runtime.getURL('images/black19.png'),
      tooltip: 'Save all to Dropbox',
      onClick: function(attachmentCards) {
        alert('not yet available - contact email-feedback@dropbox.com if you want this to work');
      }
    });

    messageView.getAttachmentCardViews().forEach(function(attachmentCardView) {
      if (attachmentCardView.getAttachmentType() !== 'FILE') {
        return;
      }

      attachmentCardView.addButton({
        iconUrl: chrome.runtime.getURL('images/white19.png'),
        tooltip: 'Save to Dropbox',
        onClick: function() {
          alert('not yet available - contact email-feedback@dropbox.com if you want this to work');
        }
      });
    });
  });

});


function isEligibleLink(link) {
  return !link.isInQuotedArea && /^https?:\/\/www\.dropbox\.com\/sh?\//.test(link.href);
}

function addCustomAttachmentCard(messageView, link) {
  var parts = link.href.split('/');
  var lastPart = parts[parts.length - 1];

  var fileName = decodeURIComponent(lastPart.replace(/(.*?)\?.*/, '$1'));

  messageView.addAttachmentCard({
    fileName: fileName,
    previewUrl: link.href,
    fileIconImageUrl: chrome.runtime.getURL('images/dark38.png'),
    documentPreviewImageUrl: chrome.runtime.getURL('images/icon128.png'),
    downloadUrl: getDownloadUrl(link.href),
    additionalButtons: [],
    foldColor: 'RGB(21, 129, 226)'
  });
}

function getDownloadUrl(url) {
  if (url.indexOf('?') === -1) {
    url += '?';
  }

  if (url.indexOf('dl=') === -1) {
    url += 'dl=1';
  } else if (url.indexOf('dl=0')) {
    url = url.replace('dl=0', 'dl=1');
  }

  return url;
}
