/* @flow */

const MAX_SEARCH_DEPTH = 3;

const searchCollection = (collection, searchDepth = 0) => {
  for (const prop in collection) {
    const value = collection[prop];
    if (typeof value === 'string' && value.indexOf('#msg-a:') > -1) {
      return value;
    } else if (searchDepth <= MAX_SEARCH_DEPTH && value instanceof Object) {
      const match = searchCollection(value, searchDepth + 1);
      if (match) return match;
    }
  }
  return null;
};

const findDraftID = (target) => {
  const match = searchCollection(target.__cdn.context);

  return match ? match.replace('#msg-a:', '') : null;
};

export default function setupComposeViewDraftIDFinder() {
  document.addEventListener('inboxSDKgetDraftIDforComposeView', ({target}) => {
    const draftID = findDraftID((target: any));

    if (!draftID) throw new Error('could not retrieve draft ID for compose view');

    (target: any).setAttribute('data-inboxsdk-draft-id', draftID);
  }, true);
}
