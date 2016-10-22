/* @flow */

import cx from 'classnames';
import React from 'react';
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
  scrollPanelIntoView(id: string) {
    console.log('TODO scrollPanelIntoView', id);
  }
  render() {
    const {content, panels, onClose} = this.props;
    const panelEls = panels.map(panel => <Panel key={panel.id} descriptor={panel} />);
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
  render() {
    const {title, iconClass, iconUrl} = this.props.descriptor;
    return (
      <div className={idMap('app_sidebar_content_panel')}>
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
