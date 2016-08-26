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

export type SelectorItem = string
  | {$or: Array<Selector>}
  | {$log: string}
  | {$watch: string | {attributeFilter: string[], fn: (el: HTMLElement) => boolean}}
  | {$filter: (el: HTMLElement) => boolean}
  | {$map: (el: HTMLElement) => ?HTMLElement}
;

export type Selector = Array<SelectorItem>;

const cssProcessor = cssParser();

export default function selectorStream(selector: Selector): (el: HTMLElement) => Kefir.Stream<ElementWithLifetime> {
  type Transformers = Array<(stream: Kefir.Stream<ElementWithLifetime>) => Kefir.Stream<ElementWithLifetime>>;
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
      const transformers = item.$or.map(selectorStream);
      return stream => Kefir.merge(transformers.map(fn =>
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
        const opens = passesChecker.filter(x => x);
        const closes = passesChecker.filter(x => !x);
        return opens.map(_.constant({el, removalStream:closes.changes()}));
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
