/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import querySelector from './querySelectorOrFail';

import outsideClicksAndEscape from './outsideClicksAndEscape';

const stopper = kefirBus();
afterEach(() => {
  stopper.emit(null);
});

const div1 = document.createElement('div');
div1.innerHTML = '<p>foo <p>bar';
document.body.appendChild(div1);

const div2 = document.createElement('div');
div2.innerHTML = '<p>foo2 <p>bar2';
document.body.appendChild(div2);

const float = document.createElement('div');
float.innerHTML = '<p>float <p>anchor';
(float:any).rfaAnchor = div1;
document.body.appendChild(float);

test('outside click works', () => {
  const onValue = jest.fn();
  outsideClicksAndEscape([div1])
    .takeUntilBy(stopper)
    .onValue(onValue);

  expect(onValue).toHaveBeenCalledTimes(0);
  const evt = Object.assign(new MouseEvent('click'), ({__testAllow: true}: any));
  querySelector(div2, 'p').dispatchEvent(evt);
  expect(onValue).toHaveBeenCalledTimes(1);
});

test('inside click ignored', () => {
  const onValue = jest.fn();
  outsideClicksAndEscape([div1, div2])
    .takeUntilBy(stopper)
    .onValue(onValue);

  expect(onValue).toHaveBeenCalledTimes(0);
  const evt = Object.assign(new MouseEvent('click'), ({__testAllow: true}: any));
  querySelector(div2, 'p').dispatchEvent(evt);
  expect(onValue).toHaveBeenCalledTimes(0);
});

test('float anchor click ignored', () => {
  const onValue = jest.fn();
  outsideClicksAndEscape([div1])
    .takeUntilBy(stopper)
    .onValue(onValue);

  expect(onValue).toHaveBeenCalledTimes(0);
  const evt = Object.assign(new MouseEvent('click'), ({__testAllow: true}: any));
  querySelector(float, 'p').dispatchEvent(evt);
  expect(onValue).toHaveBeenCalledTimes(0);
});
