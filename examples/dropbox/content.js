Promise.all([
  InboxSDK.load('1', 'dropbox-example'),
  InboxSDK.loadScript('https://www.dropbox.com/static/api/2/dropins.js')
]).then(function(results){
  var sdk = results[0];

  Dropbox.init({appKey: "82bgsya5b7h847j"});
  console.log("user email", sdk.User.getEmailAddress());

  sdk.Compose.registerComposeViewHandler(function(composeView) {
    composeView.addButton({
      title: "Add Dropbox File",
      iconUrl: chrome.runtime.getURL('images/icon48.png'),
      type: 'MODIFIER',
      onClick: function() {
        var hasSelectedText = !!composeView.getSelectedBodyText();

        var chooser = Dropbox.createChooserWidget({
          success: function(files) {
            if (hasSelectedText) {
              composeView.insertLinkIntoBodyAtCursor(files[0].name, files[0].link);
            } else {
              var thumbnailLink = files[0].thumbnailLink;
              if (thumbnailLink) {
                thumbnailLink = thumbnailLink.split("?")[0] + "?bounding_box=75&mode=crop";
              } else {
                thumbnailLink = "https://www.dropbox.com/static/images/icons/blue_dropbox_glyph.png";
              }
              composeView.insertLinkChipIntoBodyAtCursor(
                  files[0].name,
                  files[0].link,
                  thumbnailLink
              );
            }
            modal.close();
          },
          cancel: function() {
            modal.close();
          }
        });
        chooser.style.width = "660px";
        chooser.style.height = "440px";

        var modal = sdk.Modal.show({
          el: chooser,
          chrome: false
        });
      }
    });
  });

  sdk.Conversations.registerMessageViewHandler(function(messageView) {
    var links = messageView.getLinksInBody();

    links.filter(isEligibleLink).forEach(function(link) {
      addCustomAttachmentCard(messageView, link);
    });

    messageView.addAttachmentsToolbarButton({
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

  messageView.addAttachmentCardView({
    title: fileName,
    previewUrl: link.href,
    fileIconImageUrl: chrome.runtime.getURL('images/dark38.png'),
    previewThumbnailUrl: chrome.runtime.getURL('images/icon128.png'),
    buttons: [
      {
        downloadUrl: getDownloadUrl(link.href)
      }
    ],
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
