/* @flow */
//jshint ignore:start

import _ from 'lodash';
import htmlToText from '../common/html-to-text';
import * as GRP from '../platform-implementation-js/dom-driver/gmail/gmail-response-processor';
import depWarn from '../platform-implementation-js/lib/dep-warn';

export type AutoCompleteSuggestion = {
  name?: ?string;
  nameHTML?: ?string;
  routeName?: ?string;
  routeParams?: {[ix: string]: string};
  externalURL?: ?string;
  searchTerm?: ?string;
  iconUrl?: ?string;
  owner: string;
};

export default function modifySuggestions(responseText: string, modifications: AutoCompleteSuggestion[]) {
  var parsed = GRP.deserialize(responseText);
  var query = parsed[0][1];
  for (var modification of modifications) {
    var name, nameHTML;
    if (typeof modification.name === 'string') {
      name = modification.name;
      nameHTML = (_.escape(name): string);
    } else if (typeof modification.nameHTML === 'string') {
      nameHTML = modification.nameHTML;
      name = htmlToText(nameHTML);
    } else {
      throw new Error("name or nameHTML must be provided");
    }
    var description, descriptionHTML;
    if (typeof modification.description === 'string') {
      description = modification.description;
      descriptionHTML = (_.escape(description): string);
    } else if (typeof modification.descriptionHTML === 'string') {
      descriptionHTML = modification.descriptionHTML;
      description = htmlToText(descriptionHTML);
    }
    if (modification.routeName || modification.externalURL) {
      var data = {
        routeName: modification.routeName,
        routeParams: modification.routeParams,
        externalURL: modification.externalURL
      };
      nameHTML +=
        ' <span style="display:none" data-inboxsdk-suggestion="' +
        _.escape(JSON.stringify(data)) + '"></span>';
    }
    var newItem = [
      "aso.sug", modification.searchTerm || query, nameHTML, null, [], 34, null,
      "asor inboxsdk__custom_suggestion "+modification.owner, 0];
    if (descriptionHTML != null) {
      newItem[3] = [
        'aso.eme',
        description,
        name,
        descriptionHTML,
        nameHTML
      ];
    }
    if (modification.iconURL) {
      depWarn('AutocompleteSearchResult "iconURL" property is deprecated. It should be "iconUrl".');
      if (!modification.iconUrl) {
        modification.iconUrl = modification.iconURL;
      }
    }
    if (modification.iconUrl) {
      newItem[6] = ['aso.thn', modification.iconUrl];
      newItem[7] += " inboxsdk__no_bg";
    } else {
      newItem[7] += " asor_i4";
    }
    parsed[0][3].push(newItem);
  }
  return GRP.suggestionSerialize(parsed);
}
