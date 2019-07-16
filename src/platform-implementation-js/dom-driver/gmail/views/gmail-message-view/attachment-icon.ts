import { defn } from 'ud';
import SafeEventEmitter from '../../../../lib/safe-event-emitter';

export interface IconDescriptor {
  iconUrl?: string | undefined;
  iconClass?: string | undefined;
  iconHtml?: string;
  tooltip: string | HTMLElement;
  onClick?: () => void;
}

class AttachmentIcon extends SafeEventEmitter {
  private _destroyed: boolean = false;
  public iconUrl: string | null | undefined;
  public iconClass: string | null | undefined;
  public iconHtml: string | null | undefined;
  public tooltip: string | HTMLElement;
  public onClick: (() => void) | undefined;

  public constructor(iconDescriptor: IconDescriptor) {
    super();
    this.iconUrl = iconDescriptor.iconUrl || undefined;
    this.iconClass = iconDescriptor.iconClass || undefined;
    this.iconHtml = iconDescriptor.iconHtml || undefined;
    this.tooltip = iconDescriptor.tooltip;
    this.onClick = iconDescriptor.onClick || undefined;
  }

  public destroy() {
    this.emit('destroy', this);
    this._destroyed = true;
  }
}

export default defn(module, AttachmentIcon);
