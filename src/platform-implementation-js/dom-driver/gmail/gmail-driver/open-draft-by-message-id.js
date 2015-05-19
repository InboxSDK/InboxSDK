import qs from 'querystring';

export default function openDraftByMessageID(driver, messageID) {
  window.location.hash = makeNewHash(window.location.hash, messageID);
}

export function makeNewHash(oldHash, messageID) {
  oldHash = '#' + oldHash.replace(/^#/, '');
  const [pre, query] = oldHash.split('?');
  const params = qs.parse(query);
  if (params.compose) {
    params.compose += ',' + messageID;
  } else {
    params.compose = messageID;
  }
  return pre + '?' + qs.stringify(params);
}
