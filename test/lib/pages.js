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
