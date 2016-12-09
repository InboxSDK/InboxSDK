/* @flow */

import closest from 'closest-ng';

export default function setupInboxCustomViewLinkSmuggler() {
  const allowedStartTerms = new Set();

  document.addEventListener('inboxSDKregisterAllowedHashLinkStartTerm', function(event) {
    const term = (event:any).detail.term;
    allowedStartTerms.add(term);
  });

  document.addEventListener('click', function(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const anchor = closest(target, 'a[href^="#"]');
    if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
    const m = /^#([^/]+)/.exec(anchor.getAttribute('href'));
    if (!m) return;
    const startTerm = m[1];
    if (!allowedStartTerms.has(startTerm)) return;
    (event:any).preventDefault = ()=>{};
  }, true);
}
