/* @flow */

export default function finder(root: Document=document): Array<HTMLElement> {
  const chatToggle = root.querySelector('div[role=button][jsaction*="global.toggle_chat_roster"]');
  const appToolbarLocation = chatToggle ? (chatToggle:any).parentElement.parentElement.parentElement : null;
  return appToolbarLocation ? [appToolbarLocation] : [];
}
