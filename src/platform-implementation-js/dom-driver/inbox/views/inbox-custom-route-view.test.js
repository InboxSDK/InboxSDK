/* @flow */

jest.mock('../getSidebarClassnames');
import getSidebarClassnames from '../getSidebarClassnames';
import idMap from '../../../lib/idMap';

import InboxCustomRouteView from './inbox-custom-route-view';

test('works', () => {
  const view = new InboxCustomRouteView('test/:id', 'test/456');

  const stopperFn = jest.fn();
  view.getStopper().onValue(stopperFn);

  expect(view.getType()).toBe('CUSTOM');
  expect(view.getRouteType()).toBe('CUSTOM');
  expect(view.getRouteID()).toBe('test/:id');
  expect(view.getParams()).toEqual({id: '456'});

  const el = view.getCustomViewElement();
  if (!el) throw new Error('should not happen');
  document.body.appendChild(el);

  expect(Array.from(el.classList).sort()).toEqual(
    [idMap('custom_view_container'), idMap('custom_view_min_margins')].sort()
  );

  view.setFullWidth(false);
  expect(Array.from(el.classList).sort()).toEqual(
    [idMap('custom_view_container'), getSidebarClassnames().centerList].sort()
  );

  view.setFullWidth(true);
  expect(Array.from(el.classList).sort()).toEqual(
    [idMap('custom_view_container'), idMap('custom_view_min_margins')].sort()
  );

  expect(stopperFn).toHaveBeenCalledTimes(0);
  expect(document.contains(el)).toBe(true);
  view.destroy();
  expect(stopperFn).toHaveBeenCalledTimes(1);
  expect(document.contains(el)).toBe(false);
});
