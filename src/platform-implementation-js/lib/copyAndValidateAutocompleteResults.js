/* @flow */

import type {Driver} from '../driver-interfaces/driver';
import type {AutocompleteSearchResult} from '../../injected-js/gmail/modify-suggestions';

export default function copyAndValidateAutocompleteResults(
  driver: Driver,
  results: Array<AutocompleteSearchResult>
): Array<AutocompleteSearchResult> {
  if (!Array.isArray(results)) {
    throw new Error('suggestions must be an array');
  }

  return results.map(result => {
    const resultCopy = {...result};
    if (
      typeof resultCopy.name !== 'string' &&
      typeof resultCopy.nameHTML !== 'string'
    ) {
      throw new Error('suggestion must have name or nameHTML property');
    }
    if (
      typeof resultCopy.routeName !== 'string' &&
      typeof resultCopy.externalURL !== 'string' &&
      typeof resultCopy.searchTerm !== 'string' &&
      typeof resultCopy.onClick !== 'function'
    ) {
      throw new Error(
        'suggestion must have routeName, externalURL, ' +
        'searchTerm, or onClick property'
      );
    }
    if (typeof (resultCopy: any).iconURL === 'string') {
      const iconURL = (resultCopy: any).iconURL;
      driver.getLogger().deprecationWarning(
        'AutocompleteSearchResult "iconURL" property',
        'AutocompleteSearchResult.iconUrl'
      );
      if (!resultCopy.iconUrl) {
        if (driver.getOpts().REQUESTED_API_VERSION === 1) {
          resultCopy.iconUrl = iconURL;
        } else {
          console.error( //eslint-disable-line no-console
            'Support for iconURL property was dropped after API version 1'
          );
        }
      }
      delete (resultCopy: any).iconURL;
    }
    return resultCopy;
  });
}
