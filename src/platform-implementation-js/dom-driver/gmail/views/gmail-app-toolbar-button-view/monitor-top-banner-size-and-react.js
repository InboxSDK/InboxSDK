/* @flow */

const BANNER_WIDTH_LIMIT = 900;

export default function monitorTopBannerSizeAndReact() {
  const ResizeObserver = global.ResizeObserver;
  if(!ResizeObserver) return;

  const body = document.body;
  if(!body) return;

  const banner = body.querySelector('[role=banner]');
  if(!banner) return;

  if(banner.hasAttribute('inboxsdk__resize_claimed')) return;
  banner.setAttribute('inboxsdk__resize_claimed', 'true');

  const resizeObserver = new ResizeObserver(() => {
    if(banner.clientWidth < BANNER_WIDTH_LIMIT){
      body.classList.add('inboxsdk__searchIsNarrow');
    }
    else {
      body.classList.remove('inboxsdk__searchIsNarrow');
    }
  });

  resizeObserver.observe(banner);
}
