/* @flow */

import _ from 'lodash';
import {defn} from 'ud';
import htmlToText from '../common/html-to-text';
import * as GRP from '../platform-implementation-js/dom-driver/gmail/gmail-response-processor';

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

/*
Notes about the Gmail suggestions response:
The response may be made up of multiple sections. Each section can specify
results. There are three types of results: search terms/contacts, drive files,
and emails. Each section may only contain one type of result. The sections can
be in any order, though Gmail appears to always put the search terms/contacts
section first.

Some fields of a section:
0: The constant "aso.srp"
1: The user's search query
3: Array of search term/contact suggestions.
4: Array of email suggestions.
5: Array of drive suggestions.
6-9: Constants signifying type of section(?)
  search terms/contacts: 1,0,0,1
  drive:                 0,0,1,3
  email:                 0,1,0,2
11: Timestamp in microseconds. Each section should have the same timestamp.
12: Typing autocomplete value or empty array.
13: The length of the user's search query times 4 then cast to a string.

Currently modifySuggestions modifies the first section and adds the
app-provided suggestions into the search term/contact suggestions array.
*/

function modifySuggestions(responseText: string, modifications: AutoCompleteSuggestion[]): string {
  const {value: parsed, options} = GRP.deserialize(responseText);
  const query = parsed[0][1];
  for (let modification of modifications) {
    let name, nameHTML;
    if (typeof modification.name === 'string') {
      name = modification.name;
      nameHTML = (_.escape(name): string);
    } else if (typeof modification.nameHTML === 'string') {
      nameHTML = modification.nameHTML;
      name = htmlToText(nameHTML);
    }
    if (name == null || nameHTML == null) {
      throw new Error("name or nameHTML must be provided");
    }
    let description, descriptionHTML;
    if (typeof modification.description === 'string') {
      description = modification.description;
      descriptionHTML = (_.escape(description): string);
    } else if (typeof modification.descriptionHTML === 'string') {
      descriptionHTML = modification.descriptionHTML;
      description = htmlToText(descriptionHTML);
    }
    if (modification.routeName || modification.externalURL) {
      const data = {
        routeName: modification.routeName,
        routeParams: modification.routeParams,
        externalURL: modification.externalURL
      };
      nameHTML +=
        ' <span style="display:none" data-inboxsdk-suggestion="' +
        _.escape(JSON.stringify(data)) + '"></span>';
    }
    const newItem = [
      "aso.sug",
      modification.searchTerm || query,
      nameHTML,
      (null: ?[string, ?string, string, ?string, string]),
      [],
      34,
      (null: ?[string, string]),
      "asor inboxsdk__custom_suggestion "+modification.owner,
      0
    ];
    if (descriptionHTML != null) {
      newItem[3] = [
        'aso.eme',
        description,
        name,
        descriptionHTML,
        nameHTML
      ];
    }
    if (typeof modification.iconURL === 'string') {
      const iconURL = modification.iconURL;
      console.warn('AutocompleteSearchResult "iconURL" property is deprecated. It should be "iconUrl".');
      if (!modification.iconUrl) {
        modification.iconUrl = iconURL;
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
  return GRP.serialize(parsed, options);
}

export default defn(module, modifySuggestions);
