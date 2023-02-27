import { InboxSDK as InboxSDK_ } from '../../src/inboxsdk';

declare global {
  var InboxSDK: {
    load(version: string, moduleName: string): Promise<InboxSDK_>;
  };
}
