/* @flow */

export default function setupGmonkeyHandler() {
  const gmonkeyPromise = setupGmonkey();

  document.addEventListener('inboxSDKtellMeIsConversationViewDisabled', function() {
    gmonkeyPromise.then(gmonkey => {
      const answer = gmonkey.isConversationViewDisabled();
      const event = document.createEvent('CustomEvent');
      (event:any).initCustomEvent('inboxSDKgmonkeyResponse', false, false, answer);
      document.dispatchEvent(event);
    });
  });

  document.addEventListener('inboxSDKtellMeCurrentThreadId', function(event) {
    let threadId;

    if((event:any).detail.isPreviewedThread){
      const rows = Array.from(document.querySelectorAll('[gh=tl] tr.aps'));
      if(rows.length > 0){
        const elementWithId = rows.map(row => row.querySelector('[data-thread-id]')).filter(Boolean)[0];
        if(elementWithId){
          threadId = elementWithId.getAttribute('data-thread-id');
        }
        else {
          threadId = rows[0].getAttribute('data-inboxsdk-threadid');
        }
      }
    }
    else{
      threadId = window.gmonkey && window.gmonkey.v2 &&
        window.gmonkey.v2.getCurrentThread().getThreadId();
    }

    if (threadId) {
      // hash is included in the sync id route url, so we also need to take it out
      threadId = threadId.replace('#', '');
      (event:any).target.setAttribute('data-inboxsdk-currentthreadid', threadId);
    }
  });
}

function setupGmonkey() {
  return new Promise((resolve, reject) => {
    function check() {
      if (!window.gmonkey) {
        setTimeout(check, 500);
      } else {
        window.gmonkey.load("2.0", resolve);
      }
    }
    check();
  });
}
