/* @flow */

interface InjectedMutationEvent {
  attributeName?: string | undefined;
  addedNodes?: HTMLElement[] | NodeListOf<HTMLElement>;
  removedNodes?: HTMLElement[] | NodeListOf<HTMLElement>;
}

// This function takes a MockElementParent and returns a function for making it emit mutation
// events.
export default function makeMutationEventInjector(el: HTMLElement) {
  (el as any)._emitsMutations = true;
  return (event: InjectedMutationEvent) => {
    el.dispatchEvent(Object.assign(new CustomEvent('mutation') as any, event));
  };
}
