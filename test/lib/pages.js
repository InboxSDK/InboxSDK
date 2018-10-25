/* @flow */

import fs from 'fs';
import once from 'lodash/once';

function createElementWithHtml(html: string): HTMLHtmlElement {
  const el = document.createElement('html');
  el.innerHTML = html;
  return el;
}

export const page20160614 = once(() =>
  createElementWithHtml(
    fs.readFileSync(__dirname + '/../data/inbox-2016-06-14.html', 'utf8')
  )
);
export const pageWithSidebar20160614 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-with-chat-sidebar-2016-06-14.html',
      'utf8'
    )
  )
);
export const pageFullscreen20160620 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-06-20-fullscreen compose.html',
      'utf8'
    )
  )
);
export const page20160628 = once(() =>
  createElementWithHtml(
    fs.readFileSync(__dirname + '/../data/inbox-2016-06-28.html', 'utf8')
  )
);
export const page20160628_2 = once(() =>
  createElementWithHtml(
    fs.readFileSync(__dirname + '/../data/inbox-2016-06-28-2.html', 'utf8')
  )
);
export const page20160629 = once(() =>
  createElementWithHtml(
    fs.readFileSync(__dirname + '/../data/inbox-2016-06-29.html', 'utf8')
  )
);
export const page20160629_2 = once(() =>
  createElementWithHtml(
    fs.readFileSync(__dirname + '/../data/inbox-2016-06-29-2.html', 'utf8')
  )
);
export const page20160629_3 = once(() =>
  createElementWithHtml(
    fs.readFileSync(__dirname + '/../data/inbox-2016-06-29-3.html', 'utf8')
  )
);
export const page20160727 = once(() =>
  createElementWithHtml(
    fs.readFileSync(__dirname + '/../data/inbox-2016-07-27 search.html', 'utf8')
  )
);
export const page20160810 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-08-10 message.html',
      'utf8'
    )
  )
);
export const page20160810_2 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-08-10 message with attachments.html',
      'utf8'
    )
  )
);
export const page20160812 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-08-12 list with card.html',
      'utf8'
    )
  )
);
export const page20160816 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-08-16 message with attachment.html',
      'utf8'
    )
  )
);
export const page20160817 = once(() => {
  const page = createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-08-17 with preview overlay.html',
      'utf8'
    )
  );
  const ifrContent = createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-08-17 with preview overlay iframe.html',
      'utf8'
    )
  );
  const pageIfrBody = (page.querySelector('#FfJ3bf'): any).contentDocument.body;
  Array.from((ifrContent.querySelector('body'): any).children).forEach(el => {
    pageIfrBody.appendChild(el);
  });
  return page;
});
export const page20160818 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-08-18 inline compose.html',
      'utf8'
    )
  )
);
export const page20160818_2 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-08-18 message.html',
      'utf8'
    )
  )
);
export const page20160819 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-08-19 draft in thread.html',
      'utf8'
    )
  )
);
export const page20160823 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-08-23 thread in bundle.html',
      'utf8'
    )
  )
);
export const page20160830 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-08-30 preview overlay.html',
      'utf8'
    )
  )
);
export const page20160908 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-09-08 attachment card.html',
      'utf8'
    )
  )
);
export const page20161102 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2016-11-02 inline compose.html',
      'utf8'
    )
  )
);
export const page20170209 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2017-02-09 preview overlay.html',
      'utf8'
    )
  )
);
export const page20170302 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2017-03-02 inline compose.html',
      'utf8'
    )
  )
);
export const pageWithNav20170303 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2017-03-03 nav bar.html',
      'utf8'
    )
  )
);
export const pageWithAutocomplete20170306 = once(() =>
  createElementWithHtml(
    fs.readFileSync(
      __dirname + '/../data/inbox-2017-03-06 search autocomplete.html',
      'utf8'
    )
  )
);
export const page20170317 = once(() =>
  createElementWithHtml(
    fs.readFileSync(__dirname + '/../data/inbox-2017-03-17 thread.html', 'utf8')
  )
);
