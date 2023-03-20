import type * as Kefir from 'kefir';
import type {
  MoleViewDriver,
  MoleOptions,
} from '../../../driver-interfaces/mole-view-driver';
import GmailDriver from '../gmail-driver';

export default class GmailMoleViewDriver implements MoleViewDriver {
  constructor(driver: GmailDriver, options: MoleOptions);
  show(): void;
  setTitle(title: string): void;
  setMinimized(minimized: boolean): void;
  getMinimized(): boolean;
  getEventStream(): Kefir.Observable<any, unknown>;
  destroy(): void;
}
