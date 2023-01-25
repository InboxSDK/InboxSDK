import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';
import {
  AppMenuItemDescriptor,
  AppMenuItemPanelDescriptor,
  CollapsiblePanelView,
} from '../namespaces/app-menu';

type MessageEvents = {
  click: () => void;
  hover: () => void;
};

export default class AppMenuItemView extends (EventEmitter as new () => TypedEmitter<MessageEvents>) {
  addCollapsiblePanel(
    panelDescriptor: AppMenuItemPanelDescriptor
  ): CollapsiblePanelView {}
  update(menuItemDescriptor: AppMenuItemDescriptor) {}
  destroy() {}
}
