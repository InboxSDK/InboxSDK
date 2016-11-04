/* @flow */

import _ from 'lodash';
import cx from 'classnames';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import React from 'react';
import saveRefs from 'react-save-refs';
import DraggableList from 'react-draggable-list';
import SmoothCollapse from 'react-smooth-collapse';
import get from '../../../common/get-or-fail';
import idMap from '../../lib/idMap';

const springConfig = {stiffness: 400, damping: 50};

type ExpansionSettings = {
  apps: {[appId:string]: {
    ids: {[id: string]: {
      lastUse: number;
      expanded: boolean;
    }};
  }};
};

const MAX_SIDEBAR_SETTINGS = 200;

type PanelDescriptor = {
  instanceId: string;
  appId: string;
  id: string;
  title: string;
  iconClass: ?string;
  iconUrl: ?string;
  hideTitleBar: boolean;
  el: HTMLElement;
};
type Props = {
  panels: PanelDescriptor[];
  onClose(): void;
  onOutsideClick(): void;
  onMoveEnd(newList: PanelDescriptor[], item: PanelDescriptor, oldIndex: number, newIndex: number): void;
};
type State = {
  expansionSettings: ExpansionSettings;
};
export default class AppSidebar extends React.Component {
  props: Props;
  state: State;
  _list: DraggableList;
  _main: HTMLElement;
  _stopper = kefirStopper();
  constructor(props: Props) {
    super(props);
    this.state = {
      expansionSettings: this._readExpansionSettings()
    };
  }
  componentDidMount() {
    Kefir.fromEvents(window, 'storage')
      .filter(e => e.key === 'inboxsdk__sidebar_expansion_settings')
      .takeUntilBy(this._stopper)
      .onValue(() => {
        this.setState({
          expansionSettings: this._readExpansionSettings()
        });
      });
  }
  componentWillUnmount() {
    this._stopper.destroy();
  }
  scrollPanelIntoView(instanceId: string) {
    const panel: Panel = this._list.getItemInstance(instanceId);
    panel.scrollIntoView();
  }
  shouldComponentUpdate(nextProps: Props, nextState: State) {
    return this.props.panels !== nextProps.panels ||
      this.state.expansionSettings !== nextState.expansionSettings;
  }
  _readExpansionSettings(): ExpansionSettings {
    let data;
    try {
      data = JSON.parse(localStorage.getItem('inboxsdk__sidebar_expansion_settings') || 'null');
    } catch (err) {
      console.error('Failed to read sidebar settings', err);
    }
    if (data) return data;
    return {apps: {}};
  }
  _saveExpansionSettings(data: ExpansionSettings) {
    const allSidebarIds: [string,string] = _.flatMap(
      Object.keys(data.apps),
      appId => Object.keys(data.apps[appId].ids).map(id => [appId, id])
    );
    if (allSidebarIds.length > MAX_SIDEBAR_SETTINGS) {
      const idsToRemove: [string,string] = _.chain(allSidebarIds)
        .sortBy(([appId, id]) => data.apps[appId].ids[id].lastUse)
        .take(allSidebarIds.length - MAX_SIDEBAR_SETTINGS)
        .value();
      idsToRemove.forEach(([appId, id]) => {
        delete data.apps[appId].ids[id];
        if (Object.keys(data.apps[appId].ids).length === 0) {
          delete data.apps[appId];
        }
      });
    }
    try {
      localStorage.setItem('inboxsdk__sidebar_expansion_settings', JSON.stringify(data));
    } catch (err) {
      console.error('Failed to save sidebar settings', err);
    }
  }
  _expandedToggle(appId: string, id: string, expanded: boolean) {
    // Operate on the latest value from localStorage
    let expansionSettings = this._readExpansionSettings();
    if (!Object.prototype.hasOwnProperty.call(expansionSettings.apps, appId)) {
      expansionSettings.apps[appId] = {
        ids: {}
      };
    }
    const appSettings = expansionSettings.apps[appId];
    appSettings.ids[id] = {
      lastUse: Date.now(),
      expanded
    };
    this.setState({expansionSettings});
    this._saveExpansionSettings(expansionSettings);
  }
  render() {
    const {expansionSettings} = this.state;
    const {panels, onClose, onOutsideClick, onMoveEnd} = this.props;
    const showControls = panels.length > 1;

    const hideTitleBar = panels.length === 1 && panels[0].hideTitleBar;

    const panelList = panels.map(panelDescriptor => {
      const appExpansionSettings = Object.prototype.hasOwnProperty.call(expansionSettings.apps, panelDescriptor.appId) ?
        expansionSettings.apps[panelDescriptor.appId] : null;
      const panelExpansionSettings = appExpansionSettings ?
        appExpansionSettings.ids[panelDescriptor.id] : null;
      const expanded = panelExpansionSettings ? panelExpansionSettings.expanded : true;
      return {
        panelDescriptor, showControls, expanded,
        onExpandedToggle: (expanded) => {
          this._expandedToggle(panelDescriptor.appId, panelDescriptor.id, expanded);
        }
      };
    });

    return (
      <div className={cx(idMap('app_sidebar'), {
        [idMap('hideTitleBar')]: hideTitleBar
      })}>
        <div
          className={idMap('app_sidebar_main')}
          ref={el => this._main = el}
        >
          <div className={idMap('app_sidebar_content_area')}>
            <DraggableList
              padding={0}
              ref={el => this._list = el}
              itemKey={x => x.panelDescriptor.instanceId}
              template={Panel}
              list={panelList}
              onMoveEnd={(newList, movedItem, oldIndex, newIndex) => {
                onMoveEnd(newList.map(x => x.panelDescriptor), movedItem.panelDescriptor, oldIndex, newIndex);
              }}
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
  item: {
    panelDescriptor: PanelDescriptor;
    showControls: boolean;
    expanded: boolean;
    onExpandedToggle(expanded: boolean): void;
  };
  dragHandle: Function;
  itemSelected: number;
};
class Panel extends React.Component {
  props: PanelProps;
  _el: HTMLElement;
  scrollIntoView() {
    this._el.scrollIntoView();
  }
  getDragHeight() {
    return 40;
  }
  componentDidMount() {
    const expanded = !this.props.item.showControls || this.props.item.expanded;
    if (expanded) {
      document.body.dispatchEvent(
        new CustomEvent('inboxsdkSidebarPanelActivated', {
          bubbles: true, cancelable: false,
          detail: {instanceId: this.props.item.panelDescriptor.instanceId}
        })
      );
    }
  }
  componentDidUpdate(prevProps: PanelProps) {
    const prevExpanded = !prevProps.item.showControls || prevProps.item.expanded;
    const expanded = !this.props.item.showControls || this.props.item.expanded;
    if (!prevExpanded && expanded) {
      document.body.dispatchEvent(
        new CustomEvent('inboxsdkSidebarPanelActivated', {
          bubbles: true, cancelable: false,
          detail: {instanceId: this.props.item.panelDescriptor.instanceId}
        })
      );
    } else if (prevExpanded && !expanded) {
      document.body.dispatchEvent(
        new CustomEvent('inboxsdkSidebarPanelDeactivated', {
          bubbles: true, cancelable: false,
          detail: {instanceId: this.props.item.panelDescriptor.instanceId}
        })
      );
    }
  }
  shouldComponentUpdate(nextProps: PanelProps) {
    return this.props.itemSelected !== nextProps.itemSelected ||
      this.props.item.panelDescriptor !== nextProps.item.panelDescriptor ||
      this.props.item.showControls !== nextProps.item.showControls ||
      this.props.item.expanded !== nextProps.item.expanded;
  }
  render() {
    const {
      dragHandle, itemSelected, item: {
        panelDescriptor: {title, iconClass, iconUrl, el},
        showControls, expanded, onExpandedToggle
      }
    } = this.props;
    const scale = itemSelected * 0.01 + 1;
    const shadow = itemSelected * 4;

    return (
      <div
        ref={el => this._el = el}
        className={cx(idMap('app_sidebar_content_panel'), {
          [idMap('expanded')]: expanded,
          [idMap('showControls')]: showControls
        })}
        style={{
          transform: `scale(${scale})`,
          boxShadow: shadow === 0 ? 'none' : `0px 0px ${shadow}px 0px rgba(0, 0, 0, 0.3)`
        }}
      >
        <div className={idMap('app_sidebar_content_panel_top_line')}>
          {(showControls ? dragHandle : (x=>x))(
            <span className={idMap('app_sidebar_content_panel_title')}>
              <span className={cx(idMap('app_sidebar_content_panel_title_icon'), iconClass)}>
                {iconUrl && <img src={iconUrl} />}
              </span>
              <span className={idMap('app_sidebar_content_panel_title_text')}>
                {title}
              </span>
            </span>
          )}
          <span
            className={idMap('app_sidebar_content_panel_toggle')}
            onClick={() => onExpandedToggle(!expanded)}
          >
            <button
              type="button"
              className={idMap('app_sidebar_content_panel_toggle_button')}
            />
          </span>
        </div>
        <SmoothCollapse
          expanded={!showControls || expanded}
          heightTransition=".15s ease"
        >
          <PanelElement el={el} />
        </SmoothCollapse>
      </div>
    );
  }
}

type PanelElementProps = {
  el: HTMLElement;
};
class PanelElement extends React.Component {
  _content: HTMLElement;
  componentDidMount() {
    this._content.appendChild(this.props.el);
  }
  componentDidUpdate(prevProps: PanelElementProps) {
    if (prevProps.el !== this.props.el) {
      while (this._content.lastElementChild) {
        this._content.lastElementChild.remove();
      }
      this._content.appendChild(this.props.el);
    }
  }
  shouldComponentUpdate(nextProps: PanelElementProps) {
    return this.props.el !== nextProps.el;
  }
  render() {
    return (
      <div
        className={idMap('app_sidebar_content_panel_content')}
        ref={el => this._content = el}
      />
    );
  }
}
