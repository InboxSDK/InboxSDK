/* @flow */

import type GmailDriver from '../gmail-driver';

let isTrackingValidity = false;

export default function temporaryTrackDownloadUrlValidity(driver: GmailDriver) {
  if(
    driver.getAppId() !== 'sdk_streak_21e9788951' || !global.fetch || isTrackingValidity
  ) {
    return;
  }
  isTrackingValidity = true;

  driver.getAttachmentCardViewDriverStream()
    .filter(cardView => cardView.getAttachmentType() === 'FILE')
    .filter(() => Math.random() < 0.01)
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

      driver.getLogger().eventSdkPassive('testing.getDownloadURL success');
    });
}
