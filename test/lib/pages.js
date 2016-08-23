/* @flow */

import fs from 'fs';
import once from 'lodash/once';
import jsdomDoc from './jsdom-doc';

export const page20160614: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-06-14.html', 'utf8')));
export const pageWithSidebar20160614: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-with-chat-sidebar-2016-06-14.html', 'utf8')));
export const pageFullscreen20160620: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-06-20-fullscreen compose.html', 'utf8')));
export const page20160628: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-06-28.html', 'utf8')));
export const page20160628_2: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-06-28-2.html', 'utf8')));
export const page20160629: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-06-29.html', 'utf8')));
export const page20160629_2: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-06-29-2.html', 'utf8')));
export const page20160629_3: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-06-29-3.html', 'utf8')));
export const page20160727: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-07-27 search.html', 'utf8')));
export const page20160810: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-08-10 message.html', 'utf8')));
export const page20160810_2: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-08-10 message with attachments.html', 'utf8')));
export const page20160812: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-08-12 list with card.html', 'utf8')));
export const page20160816: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-08-16 message with attachment.html', 'utf8')));
export const page20160817: () => Document = once(() => {
  const page = jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-08-17 with preview overlay.html', 'utf8'));
  const ifrContent = jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-08-17 with preview overlay iframe.html', 'utf8'));
  const pageIfrBody = (page:any).querySelector('#FfJ3bf').contentDocument.body;
  Array.from(ifrContent.body.children).forEach(el => {
    pageIfrBody.appendChild(el);
  });
  return page;
});
export const page20160818: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-08-18 inline compose.html', 'utf8')));
export const page20160818_2: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-08-18 message.html', 'utf8')));
export const page20160819: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-08-19 draft in thread.html', 'utf8')));
export const page20160823: () => Document = once(() =>
  jsdomDoc(fs.readFileSync(__dirname+'/../data/inbox-2016-08-23 thread in bundle.html', 'utf8')));
