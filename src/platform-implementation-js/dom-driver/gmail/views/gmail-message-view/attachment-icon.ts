import { AttachmentIcon as IAttachmentIcon } from '../../../../../inboxsdk';
import SafeEventEmitter from '../../../../lib/safe-event-emitter';

class AttachmentIcon extends (SafeEventEmitter as new () => IAttachmentIcon) {}

export default AttachmentIcon;
