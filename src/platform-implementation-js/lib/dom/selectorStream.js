/* @flow */

import _ from 'lodash';
import asap from 'asap';
import Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import cssParser from 'postcss-selector-parser';

import makeElementChildStream from './make-element-child-stream';
import makeMutationObserverChunkedStream from './make-mutation-observer-chunked-stream';
import type {ElementWithLifetime} from './make-element-child-stream';
import makeCssSelectorChecker from './css/makeCssSelectorChecker';
import getRelevantAttributeList from './css/getRelevantAttributeList';

/*
selectorStream :: Selector -> HTMLElement -> Kefir.Observable<ElementWithLifetime>

The function takes the Selector array, and returns a function that can apply
the Selector to an HTMLElement to return a stream of matched elements.

The Selector array is made up of SelectorOperators. Initially, only the input
element is matched. Each SelectorOperator transforms the matched set of
elements sequentially.
*/
export type SelectorOperator =
  string
  // The children operator: this will change the matched set to contain only
  // the direct children of the current matched set, and then filters them
  // based on a css selector string.

  | {$filter: (el: HTMLElement) => boolean}
  // The $filter operator allows you to specify a function which will be called
  // on every matched element. If the function returns false, then the element
  // will be removed from the matched set.

  | {$map: (el: HTMLElement) => ?HTMLElement}
  // The $map operator allows you to specify a function which will be called
  // on every matched element, and each element in the matched set will be
  // replaced with the element returned by your function. If your function
  // returns null, then the element will just be removed from the matched set.

  | {$watch: string | {attributeFilter: string[], fn: (el: HTMLElement) => boolean}}
  // The $watch operator allows you to specify either a css selector string, or
  // an attributeFilter list and a function. The currently matched elements
  // will be removed from the matched set if they don't match the css selector
  // string or pass the given function. If the element has any attributes
  // changed, then it will be re-considered and may be added or removed from
  // the matched set.

  | {$or: Array<Selector>}
  // The $or operator forks the operator list into multiple lists, and then
  // re-combines the resulting matched sets.

  | {$log: string}
  // The $log operator uses `console.log` to log every element in the matched
  // set to the console with a given string prefix.
;

export type Selector = Array<SelectorOperator>;

const cssProcessor = cssParser();

export default function selectorStream(selector: Selector): (el: HTMLElement) => Kefir.Observable<ElementWithLifetime> {
  type Transformers = Array<(stream: Kefir.Observable<ElementWithLifetime>) => Kefir.Observable<ElementWithLifetime>>;
  const transformers: Transformers = selector.map(item => {
    if (typeof item === 'string') {
      const p = cssProcessor.process(item).res;
      const checker = makeCssSelectorChecker(p);
      const filterFn = ({el}) => checker(el);
      return stream => stream.flatMap(({el,removalStream}) =>
        makeElementChildStream(el)
          .filter(filterFn)
          .takeUntilBy(removalStream)
      );
    } else if (item.$or) {
      const selectors = item.$or.map(selectorStream);
      return stream => Kefir.merge(selectors.map(fn =>
        stream.flatMap(({el,removalStream}) => fn(el).takeUntilBy(removalStream))
      ));
    } else if (item.$watch) {
      const {$watch} = (item:any);
      let checker, attributeFilter;
      if (typeof $watch === 'string') {
        const p = cssProcessor.process($watch).res;
        checker = makeCssSelectorChecker(p);
        attributeFilter = getRelevantAttributeList(p);
      } else {
        checker = $watch.fn;
        attributeFilter = $watch.attributeFilter;
      }
      return stream => stream.flatMap(({el,removalStream}) => {
        const passesChecker = makeMutationObserverChunkedStream(el, {
            attributes: true, attributeFilter
          })
          .toProperty(()=>null)
          .map(() => checker(el))
          .takeUntilBy(removalStream)
          .beforeEnd(()=>false)
          .skipDuplicates();
        const passes = passesChecker.filter(x => x);
        const fails = passesChecker.filter(x => !x);
        return passes.map(_.constant({el, removalStream:fails.changes()}));
      });
    } else if (item.$log) {
      const {$log} = (item:any);
      return stream => stream.map(event => {
        console.log($log, event.el);
        return event;
      });
    } else if (item.$filter) {
      const {$filter} = (item:any);
      return stream => stream.filter(({el}) => $filter(el));
    } else if (item.$map) {
      const {$map} = (item:any);
      return stream => stream.flatMap(({el,removalStream}) => {
        const transformed = $map(el);
        return transformed ?
          Kefir.constant({el: transformed, removalStream}) :
          Kefir.never()
      });
    }
    throw new Error(`Invalid selector item: ${JSON.stringify(item)}`);
  });
  return el => {
    return transformers.reduce(
      (stream, fn) => fn(stream),
      Kefir.stream(emitter => {
        const removalStream = kefirStopper();
        asap(() => {
          emitter.emit({el, removalStream});
        });
        return () => {
          removalStream.destroy();
        };
      })
    );
  };
}
