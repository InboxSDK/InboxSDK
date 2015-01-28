var _ = require('lodash');
var htmlToText = require('../common/html-to-text');
var gmailResponseProcessor = require('../platform-implementation-js/dom-driver/gmail/gmail-response-processor');

module.exports = function modifySuggestions(responseText, modifications) {
  console.log('modifySuggestions', modifications, responseText.slice(0,30));
  let parsed = gmailResponseProcessor.deserialize(responseText);
  const query = parsed[0][1];
  for (let modification of modifications) {
    if (modification.name) {
      modification.nameHTML = _.escape(modification.name);
    }
    if (modification.description) {
      modification.descriptionHTML = _.escape(modification.description);
    }
    let newItem = ["aso.sug",query,modification.nameHTML,null,[],34,null,"asor asor_i4",0];
    if (modification.descriptionHTML) {
      newItem[3] = [
        'aso.eme',
        htmlToText(modification.descriptionHTML),
        htmlToText(modification.nameHTML),
        modification.descriptionHTML,
        modification.nameHTML
      ];
    }
    if (modification.iconURL) {
      newItem[6] = ['aso.thn', modification.iconURL];
      newItem[7] = "asor inboxsdk__no_bg";
    }
    parsed[0][3].push(newItem);
  }
  console.log('part uno', parsed[0][3]);
  return gmailResponseProcessor.suggestionSerialize(parsed);
};
