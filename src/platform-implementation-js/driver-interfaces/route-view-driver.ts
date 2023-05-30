import type Kefir from 'kefir';
import type GmailCollapsibleSectionView from '../dom-driver/gmail/views/gmail-collapsible-section-view';
// The necessary interface that Router and RouteView expect.
export type MinRouteViewDriver = {
  getRouteType(): string;
  getRouteID(): string;
  getParams(): Record<string, string>;
  getEventStream(): Kefir.Observable<Record<string, any>>;
  getStopper(): Kefir.Observable<any>;
};
// The necessary interface that ListRouteView and CustomRouteView expect.
export type RouteViewDriver = MinRouteViewDriver & {
  refresh(): void;
  getType(): string;
  getHash(): string;
  addSection(
    sectionDescriptorProperty: Kefir.Observable<
      Record<string, any> | null | undefined
    >,
    groupOrderHint: any
  ): GmailCollapsibleSectionView;
  addCollapsibleSection(
    sectionDescriptorProperty: Kefir.Observable<
      Record<string, any> | null | undefined
    >,
    groupOrderHint: any
  ): GmailCollapsibleSectionView;
  getCustomViewElement(): HTMLElement | null | undefined;
  setFullWidth(fullWidth: boolean): void;
};
