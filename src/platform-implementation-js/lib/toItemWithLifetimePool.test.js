/* @flow */

import toItemWithLifetimePool from './toItemWithLifetimePool';

import LiveSet from 'live-set';
import type {TagTreeNode} from 'tag-tree';
import delay from 'pdelay';

function makeMockNode(className: string): TagTreeNode<HTMLElement> {
  const el = Object.assign(document.createElement('div'), {className});
  return ({getValue: () => el}: any);
}

test('works', async () => {
  const alpha = makeMockNode('alpha');
  const beta = makeMockNode('beta');
  const gamma = makeMockNode('gamma');

  const {liveSet, controller} = LiveSet.active(new Set([alpha, beta]));

  const onAny = jest.fn();
  toItemWithLifetimePool(liveSet).items().onAny(onAny);
  await delay(0);
  expect(onAny.mock.calls.map(([{type, value: {el}}]) => [type, el.className]))
    .toEqual([['value', 'alpha'], ['value', 'beta']]);

  controller.add(gamma);
  expect(onAny.mock.calls.map(([{type, value: {el}}]) => [type, el.className]))
    .toEqual([['value', 'alpha'], ['value', 'beta']]);

  await delay(0);
  expect(onAny.mock.calls.map(([{type, value: {el}}]) => [type, el.className]))
    .toEqual([['value', 'alpha'], ['value', 'beta'], ['value', 'gamma']]);

  const removalA = jest.fn(), removalB = jest.fn(), removalG = jest.fn();
  onAny.mock.calls[0][0].value.removalStream.onAny(removalA);
  onAny.mock.calls[1][0].value.removalStream.onAny(removalB);
  onAny.mock.calls[2][0].value.removalStream.onAny(removalG);
  controller.remove(alpha);
  controller.remove(gamma);
  expect(removalA.mock.calls).toEqual([]);
  expect(removalG.mock.calls).toEqual([]);
  await delay(0);
  expect(removalA.mock.calls).toEqual([
    [{type: 'value', value: undefined}],
    [{type: 'end'}],
  ]);
  expect(removalB.mock.calls).toEqual([]);
  expect(removalG.mock.calls).toEqual([
    [{type: 'value', value: undefined}],
    [{type: 'end'}],
  ]);
});
