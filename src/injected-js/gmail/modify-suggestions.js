/* @flow */

import escape from 'lodash/escape';
import autoHtml from 'auto-html';
import {defn} from 'ud';
import htmlToText from '../../common/html-to-text';
import * as GRP from '../../platform-implementation-js/dom-driver/gmail/gmail-response-processor';

// This is the type that the user provides.
export type AutocompleteSearchResult = {
  name?: ?string;
  nameHTML?: ?string;
  description?: ?string;
  descriptionHTML?: ?string;
  routeName?: ?string;
  routeParams?: ?{[ix: string]: string|number};
  externalURL?: ?string;
  searchTerm?: ?string;
  iconUrl?: ?string;
  iconClass?: ?string;
  onClick?: ?()=>void;
};

// These ids are part of the object constructed by the SDK used to refer to a
// suggestion to the injected script.
export type AutocompleteSearchResultWithId = AutocompleteSearchResult&{
  id: string;
  providerId: string;
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

function modifySuggestions(responseText: string, modifications: AutocompleteSearchResultWithId[]): string {
  const {value: parsed, options} = GRP.deserialize(responseText);
  const query = parsed[0][1];
  for (let modification of modifications) {
    let name, nameHTML;
    if (typeof modification.name === 'string') {
      name = modification.name;
      nameHTML = (escape(name): string);
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
      descriptionHTML = (escape(description): string);
    } else if (typeof modification.descriptionHTML === 'string') {
      descriptionHTML = modification.descriptionHTML;
      description = htmlToText(descriptionHTML);
    }
    const data = {
      id: modification.id,
      routeName: modification.routeName,
      routeParams: modification.routeParams,
      externalURL: modification.externalURL
    };
    nameHTML +=
      autoHtml ` <span style="display:none" data-inboxsdk-suggestion="${JSON.stringify(data)}"></span>`;
    const newItem = [
      "aso.sug",
      modification.searchTerm || query,
      nameHTML,
      (null: ?[string, ?string, string, ?string, string]),
      [],

      // screen height estimate. Currently Gmail bugs out if the screen height
      // estimates add up to above the screen height, so let's avoid making the
      // issue more likely by telling it our entries are zero-height.
      0,

      (null: ?[string, string]),
      "asor inboxsdk__custom_suggestion "+modification.providerId + " " + (modification.iconClass || ''),
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
