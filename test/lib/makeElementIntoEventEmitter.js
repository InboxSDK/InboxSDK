/* @flow */

import {EventEmitter} from 'events';

type InjectedMutationEvent = {
  addedNodes?: HTMLElement[]|HTMLCollection<HTMLElement>;
  removedNodes?: HTMLElement[]|HTMLCollection<HTMLElement>;
};

export default function makeMutationEventInjector(el: HTMLElement) {
  (el:any)._emitsMutations = true;
  return (event: InjectedMutationEvent) => {
    el.dispatchEvent(Object.assign((new CustomEvent('mutation'):any), {
      addedNodes: event.addedNodes || [],
      removedNodes: event.removedNodes || []
    }));
  };
}
