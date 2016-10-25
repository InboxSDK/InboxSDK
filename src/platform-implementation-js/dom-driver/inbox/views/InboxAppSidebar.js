/* @flow */

import cx from 'classnames';
import React from 'react';
import saveRefs from 'react-save-refs';
import get from '../../../../common/get-or-fail';
import idMap from '../../../lib/idMap';

type PanelDescriptor = {
  id: string;
  title: string;
  iconClass: ?string;
  iconUrl: ?string;
  el: HTMLElement;
};
type Props = {
  content: any;
  panels: PanelDescriptor[];
  onClose(): void;
};
export default class InboxAppSidebar extends React.PureComponent {
  props: Props;
  _panels: Map<string,Panel> = new Map();
  scrollPanelIntoView(id: string) {
    const panel = get(this._panels, id);
    panel.scrollIntoView();
  }
  render() {
    const {content, panels, onClose} = this.props;
    const panelEls = panels.map(panel =>
      <Panel
        key={panel.id}
        descriptor={panel}
        ref={saveRefs(this._panels, panel.id)}
      />
    );
    return (
      <div className={idMap('app_sidebar')}>
        <div className={idMap('app_sidebar_main')}>
          <div className={idMap('sidebar_panel_content_area')}>
            {panelEls}
          </div>
        </div>
        <button
          className="inboxsdk__close_button"
          type="button"
          title="Close"
          onClick={onClose}
        />
      </div>
    );
  }
}

type PanelProps = {
  descriptor: PanelDescriptor;
};
class Panel extends React.PureComponent {
  props: PanelProps;
  _el: HTMLElement;
  _content: HTMLElement;
  componentDidMount() {
    this._content.appendChild(this.props.descriptor.el);
  }
  componentDidUpdate(prevProps: PanelProps) {
    if (prevProps.descriptor.el !== this.props.descriptor.el) {
      while (this._content.lastElementChild) {
        this._content.lastElementChild.remove();
      }
      this._content.appendChild(this.props.descriptor.el);
    }
  }
  scrollIntoView() {
    this._el.scrollIntoView();
  }
  render() {
    const {title, iconClass, iconUrl} = this.props.descriptor;
    return (
      <div
        ref={el => this._el = el}
        className={idMap('app_sidebar_content_panel')}
      >
        <div className={idMap('app_sidebar_content_panel_title')}>
          <span className={cx(idMap('app_sidebar_content_panel_title_icon'), iconClass)}>
            {iconUrl && <img src={iconUrl} />}
          </span>
          <span className={idMap('app_sidebar_content_panel_title_text')}>
            {title}
          </span>
        </div>
        <div
          className={idMap('app_sidebar_content_panel_content')}
          ref={el => this._content = el}
        />
      </div>
    );
  }
}
