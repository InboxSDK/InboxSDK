/* @flow */

const MAX_SEARCH_DEPTH = 3;

const searchCollection = (collection, predicate, maxDepth, currentDepth = 0) => {
  for (const prop in collection) {
    const value = collection[prop];
    if (predicate(value)) {
      return value;
    } else if (currentDepth <= maxDepth && value instanceof Object) {
      const match = searchCollection(value, predicate, maxDepth, currentDepth + 1);
      if (match) return match;
    }
  }
  return null;
};

const findDraftID = target => {
  const match = searchCollection(target.__cdn.context, value => (
    typeof value === 'string' && value.indexOf('#msg-a:') > -1
  ), MAX_SEARCH_DEPTH);

  return match ? match.replace('#msg-a:', '') : null;
};

export default function setupComposeViewDraftIDFinder() {
  document.addEventListener('inboxSDKgetDraftIDforComposeView', ({target}) => {
    const draftID = findDraftID((target: any));

    if (!draftID) throw new Error('could not retrieve draft ID for compose view');

    (target: any).setAttribute('data-inboxsdk-draft-id', draftID);
  }, true);
}
