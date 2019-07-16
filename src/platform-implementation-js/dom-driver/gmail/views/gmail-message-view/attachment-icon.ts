import { defn } from 'ud';
import SafeEventEmitter from '../../../../lib/safe-event-emitter';

class AttachmentIcon extends SafeEventEmitter {
  public destroyed: boolean = false;
}

export default defn(module, AttachmentIcon);
