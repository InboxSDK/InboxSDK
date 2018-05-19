/* @flow */

import type GmailDriver from '../gmail-driver';

export default function temporaryTrackDownloadUrlValidity(driver: GmailDriver) {

  //if(!(driver._appId || '').includes('streak') && global.fetch) return;

  driver.getAttachmentCardViewDriverStream()
    .filter(cardView => cardView.getAttachmentType() === 'FILE')
    //.filter(() => Math.random() < 0.01)
    .onValue(async (cardView) => {

      const downloadLinkBefore = cardView._getDownloadLink();
      let downloadUrl;
      try{
        downloadUrl = await cardView.getDownloadURL();
      }
      catch(err){
        driver.getLogger().error(err, {
          reason: 'problem getting download url',
          downloadLinkBefore,
          downloadLinkAfter: cardView._getDownloadLink()
        });
        return;
      }

      if(!downloadUrl){
        driver.getLogger().error(new Error('no download url found'), {
          downloadLinkBefore,
          downloadLinkAfter: cardView._getDownloadLink()
        });
        return;
      }
    });
}
