import * as Kefir from 'kefir';
import Combokeys from 'combokeys-capture';

const combokeys =
  typeof document !== 'undefined' && new Combokeys(document.body, true);

export default function keyboardShortcutStream(
  chord: string
): Kefir.Observable<object, never> {
  return Kefir.stream(emitter => {
    return (
      combokeys &&
      combokeys.bind(
        chord,
        function(domEvent: any) {
          emitter.emit(domEvent);
          return false;
        },
        'keydown'
      )
    );
  });
}
