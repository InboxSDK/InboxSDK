/* @flow */

import delay from 'pdelay';

import HandlerRegistry from './handler-registry';

it('handler called on existing targets asynchronously', async () => {
  const target1 = ['target1'];
  const target2 = ['target2'];

  const reg = new HandlerRegistry();
  reg.addTarget(target1);
  reg.addTarget(target2);

  const needToSee = new Set([target1, target2]);
  reg.registerHandler(target => {
    expect(needToSee.delete(target)).toBe(true);
  });
  expect(needToSee.size).toBe(2);
  await delay(1);
  expect(needToSee.size).toBe(0);
});

it('handler called on new targets', async () => {
  const target1 = ['target1'];
  const target2 = ['target2'];
  const target3 = ['target3'];

  const reg = new HandlerRegistry();
  reg.addTarget(target1);

  let calls = 0;
  reg.registerHandler(target => {
    switch(calls++) {
      case 0:
        expect(target).toBe(target1);
        break;
      case 1:
        expect(target).toBe(target2);
        break;
      case 2:
        expect(target).toBe(target3);
        break;
      default:
        throw new Error("Should not happen");
    }
  });

  reg.addTarget(target2);
  expect(calls).toBe(0);
  await delay(1);
  expect(calls).toBe(2);
  reg.addTarget(target3);
  expect(calls).toBe(3);
});

it('handler not called on removed targets', async () => {
  const target1 = ['target1'];
  const target2 = ['target2'];
  const target3 = ['target3'];

  const reg = new HandlerRegistry();
  reg.addTarget(target1);
  reg.addTarget(target2);
  reg.addTarget(target3);

  reg.removeTarget(target1);

  let calls = 0;
  reg.registerHandler(target => {
    calls++;
    expect(target).toBe(target3);
  });
  reg.removeTarget(target2);

  expect(calls).toBe(0);
  await delay(1);
  expect(calls).toBe(1);
});

it('handler can unsubscribe', async () => {
  const target1 = ['target1'];
  const target2 = ['target2'];

  const reg = new HandlerRegistry();
  reg.addTarget(target1);

  const unsub = reg.registerHandler(target => {
    throw new Error('Should not happen');
  });
  unsub();
  reg.addTarget(target2);
  await delay(1);
});

it('dumpHandlers works', async () => {
  // Make sure it can handle dumping handlers that have fired already and
  // ones that haven't passed the initial asap delay.
  let i = 0;
  const target1 = ['target1'];
  const target2 = ['target2'];

  const reg = new HandlerRegistry();
  reg.addTarget(target1);

  reg.registerHandler(target => {
    if (i++ !== 0)
      throw new Error('Should not happen');
  });

  await delay(2);

  reg.registerHandler(target => {
    throw new Error('Should not happen');
  });
  reg.dumpHandlers();
  reg.addTarget(target2);
  await delay(1);
});
