import cachebustUrl from './cachebust-url';
import fromPairs from 'lodash/fromPairs';

const URLS = ['https://www.inboxsdk.com/images/logo-red.png'];

function imageTest(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = document.createElement('img');
    img.onload = function() {
      resolve(true);
    };
    img.addEventListener('loadend', function() {
      resolve(false);
    });
    img.onerror = function() {
      resolve(false);
    };
    img.src = cachebustUrl(url);
  });
}

export default function connectivityTest(): Promise<{
  [url: string]: boolean;
}> {
  return Promise.all(
    URLS.map(url => imageTest(url).then(success => [url, success]))
  ).then(results => fromPairs(results));
}
