/* @flow */

import find from 'lodash/find';
import isPlainObject from 'lodash/isPlainObject';

export default function setupComposeViewDraftIDFinder() {
  document.addEventListener('inboxSDKgetDraftIDforComposeView', ({target}) => {
    const {model} = find((target: any).__cdn.context, (value) => {
      return value.hasOwnProperty('model');
    });

    const draftID = find(model, (value) => {
      if (typeof value === 'string' && value.indexOf('#msg-a:') > -1) {
        return true;
      } else if (isPlainObject(value) || Array.isArray(value)) {
        return find(value, (value) => {
          typeof value === 'string' && value.indexOf('#msg-a:') > -1
        });
      } else {
        return null;
      }
    });

    if (!draftID) throw new Error('could not retrieve draft ID for compose view');

    (target: any).setAttribute('data-inboxsdk-draft-id', draftID.replace('#msg-a:r-', ''));
  }, true);
}
