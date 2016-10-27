/* @flow */

import cx from 'classnames';
import React from 'react';
import saveRefs from 'react-save-refs';
import DraggableList from 'react-draggable-list';
import SmoothCollapse from 'react-smooth-collapse';
import get from '../../../../common/get-or-fail';
import idMap from '../../../lib/idMap';

const springConfig = {stiffness: 400, damping: 50};

type PanelDescriptor = {
  id: string;
  title: string;
  iconClass: ?string;
  iconUrl: ?string;
  el: HTMLElement;
};
type Props = {
  panels: PanelDescriptor[];
  onClose(): void;
  onOutsideClick(): void;
  onMoveEnd(newList: PanelDescriptor[]): void;
};
export default class InboxAppSidebar extends React.Component {
  props: Props;
  _list: DraggableList;
  _main: HTMLElement;
  scrollPanelIntoView(id: string) {
    const panel: Panel = this._list.getItemInstance(id);
    panel.scrollIntoView();
  }
  shouldComponentUpdate(nextProps: Props) {
    return this.props.panels !== nextProps.panels;
  }
  render() {
    const {panels, onClose, onOutsideClick, onMoveEnd} = this.props;
    return (
      <div className={idMap('app_sidebar')}>
        <div
          className={idMap('app_sidebar_main')}
          ref={el => this._main = el}
        >
          <div className={idMap('app_sidebar_content_area')}>
            <DraggableList
              ref={el => this._list = el}
              itemKey="id"
              template={Panel}
              list={panels}
              onMoveEnd={onMoveEnd}
              springConfig={springConfig}
              container={()=>this._main}
            />
          </div>
          <div
            className={idMap('app_sidebar_content_area_padding')}
            onClick={event => {
              event.preventDefault();
              onOutsideClick();
            }}
          />
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
  item: PanelDescriptor;
  dragHandle: Function;
};
type PanelState = {
  expanded: boolean;
};
class Panel extends React.Component {
  props: PanelProps;
  _el: HTMLElement;
  _content: HTMLElement;
  state: PanelState = {
    expanded: true
  };
  componentDidMount() {
    this._content.appendChild(this.props.item.el);
  }
  componentDidUpdate(prevProps: PanelProps) {
    if (prevProps.item.el !== this.props.item.el) {
      while (this._content.lastElementChild) {
        this._content.lastElementChild.remove();
      }
      this._content.appendChild(this.props.item.el);
    }
  }
  shouldComponentUpdate(nextProps: PanelProps, nextState: PanelState) {
    return this.props.item !== nextProps.item ||
      this.state.expanded !== nextState.expanded;
  }
  scrollIntoView() {
    this._el.scrollIntoView();
  }
  getDragHeight() {
    return 16;
  }
  render() {
    const {dragHandle, item: {title, iconClass, iconUrl}} = this.props;
    const toggleExpansion = event => {
      event.preventDefault();
      this.setState({expanded: !this.state.expanded});
    };
    return (
      <div
        ref={el => this._el = el}
        className={cx(idMap('app_sidebar_content_panel'), {[idMap('expanded')]: this.state.expanded})}
      >
        <div className={idMap('app_sidebar_content_panel_title')}>
          {dragHandle(
            <span className={cx(idMap('app_sidebar_content_panel_title_icon'), iconClass)}>
              {iconUrl && <img src={iconUrl} />}
            </span>
          )}
          {dragHandle(
            <span
              className={idMap('app_sidebar_content_panel_title_text')}
              onClick={toggleExpansion}
            >
              {title}
            </span>
          )}
          <button
            type="button"
            className={idMap('app_sidebar_content_panel_toggle')}
            onClick={toggleExpansion}
          />
        </div>
        <SmoothCollapse
          expanded={this.state.expanded}
          heightTransition=".15s ease"
        >
          <div
            className={idMap('app_sidebar_content_panel_content')}
            ref={el => this._content = el}
          />
        </SmoothCollapse>
      </div>
    );
  }
}
