/* @flow */
//jshint ignore:start

import cachebustUrl from './cachebust-url';
import zipObject from 'lodash/array/zipObject';

const URLS = [
  'https://mailfoogae.appspot.com/build/images/composeOverflowToggle.png',
  'https://www.streak.com/build/images/composeOverflowToggle.png',
  'https://www.inboxsdk.com/images/logo-red.png'
];

function imageTest(url: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = function() {
      resolve(true);
    };
    (img:any).onloadend = img.onerror = function() {
      resolve(false);
    };
    img.src = cachebustUrl(url);
  });
}

export default function connectivityTest(): Promise<{[url:string]:boolean}> {
  return Promise.all(URLS.map(url =>
      imageTest(url).then(success => [url, success])
    ))
    .then(results => zipObject(results));
}
