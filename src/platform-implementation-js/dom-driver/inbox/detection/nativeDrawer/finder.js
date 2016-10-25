/* @flow */

import findParent from '../../../../../common/find-parent';

export default function finder(root: Document=document): Array<HTMLElement> {
  const drawerUploadFilesBtn = root.querySelector('div[jsaction="global.exit_full_screen"] div[role=dialog][aria-busy=true] div[role=link][jsaction$=".open_local_file_picker"]');

  if (drawerUploadFilesBtn) {
    const drawer = findParent(
      drawerUploadFilesBtn,
      el => el.getAttribute('role') === 'dialog'
    );
    if (drawer) return [drawer];
  }
  return [];
}
