/* @flow */

import cx from 'classnames';
import React from 'react';
import saveRefs from 'react-save-refs';
import DraggableList from 'react-draggable-list';
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
  content: any;
  panels: PanelDescriptor[];
  onClose(): void;
  onOutsideClick(): void;
  onMoveEnd(newList: PanelDescriptor[]): void;
};
export default class InboxAppSidebar extends React.PureComponent {
  props: Props;
  _list: DraggableList;
  _main: HTMLElement;
  scrollPanelIntoView(id: string) {
    const panel: Panel = this._list.getItemInstance(id);
    panel.scrollIntoView();
  }
  render() {
    const {content, panels, onClose, onOutsideClick, onMoveEnd} = this.props;
    return (
      <div className={idMap('app_sidebar')}>
        <div
          className={idMap('app_sidebar_main')}
          ref={el => this._main = el}
          onClick={event => {
            if (event.target === this._main) {
              event.preventDefault();
              onOutsideClick();
            }
          }}
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
class Panel extends React.PureComponent {
  props: PanelProps;
  _el: HTMLElement;
  _content: HTMLElement;
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
  scrollIntoView() {
    this._el.scrollIntoView();
  }
  getDragHeight() {
    return 16;
  }
  render() {
    const {dragHandle, item: {title, iconClass, iconUrl}} = this.props;
    return (
      <div
        ref={el => this._el = el}
        className={idMap('app_sidebar_content_panel')}
      >
        {dragHandle(
          <div className={idMap('app_sidebar_content_panel_title')}>
            <span className={cx(idMap('app_sidebar_content_panel_title_icon'), iconClass)}>
              {iconUrl && <img src={iconUrl} />}
            </span>
            <span className={idMap('app_sidebar_content_panel_title_text')}>
              {title}
            </span>
          </div>
        )}
        <div
          className={idMap('app_sidebar_content_panel_content')}
          ref={el => this._content = el}
        />
      </div>
    );
  }
}
