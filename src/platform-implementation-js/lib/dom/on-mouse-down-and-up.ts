import * as Kefir from 'kefir';
import fromEventTargetCapture from '../from-event-target-capture';
import { defn } from 'ud';

const pageMouseUps = fromEventTargetCapture(document.body, 'mouseup');

const onMouseDownAndUp = defn(
  module,
  function onMouseDownAndUp(el: HTMLElement): Kefir.Observable<Event, unknown> {
    const elMouseDowns = fromEventTargetCapture(el, 'mousedown');
    return elMouseDowns.flatMapLatest(() =>
      pageMouseUps.take(1).filter((event) => el.contains(event.target))
    );
  }
);

export default onMouseDownAndUp;
