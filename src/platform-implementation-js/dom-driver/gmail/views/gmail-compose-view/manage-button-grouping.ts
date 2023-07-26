import { defn, defonce } from 'ud';
import GmailComposeButtonView from './gmail-compose-button-view';
import BasicButtonViewController from '../../../../widgets/buttons/basic-button-view-controller';
import insertElementInOrder from '../../../../lib/dom/insert-element-in-order';
import { simulateClick } from '../../../../lib/dom/simulate-mouse-event';
import waitFor from '../../../../lib/wait-for';
import Logger from '../../../../lib/logger';
import querySelector from '../../../../lib/dom/querySelectorOrFail';
import censorHTMLtree from '../../../../../common/censorHTMLtree';
import positionFormattingToolbar from './position-formatting-toolbar';
import type GmailComposeView from '../gmail-compose-view';
import get from '../../../../../common/get-or-fail';
const memberMap = defonce(
  module,
  () =>
    new Map<
      GmailComposeView,
      {
        formattingToolbarMutationObserver?: MutationObserver;
        groupedActionToolbarContainer?: HTMLElement;
        groupedToolbarButtonViewController?: BasicButtonViewController;
      }
    >()
);
export default defn(
  module,
  function manageButtonGrouping(gmailComposeView: GmailComposeView) {
    if (
      gmailComposeView
        .getElement()
        .getAttribute('data-button-grouping-managed') === 'true'
    ) {
      return;
    }

    var members = {};
    memberMap.set(gmailComposeView, members);
    gmailComposeView
      .getElement()
      .setAttribute('data-button-grouping-managed', 'true');
    gmailComposeView
      .getEventStream()
      .filter((event) => event.eventName === 'fullscreenChanged')
      .debounce(10)
      .onValue(() => {
        _handleComposeFullscreenStateChanged(gmailComposeView);
      });
    gmailComposeView
      .getEventStream()
      .filter(function (event) {
        return event.eventName === 'buttonAdded';
      })
      .onValue(() => {
        groupButtonsAndAdjustToolbarPosition(gmailComposeView);
      });
    gmailComposeView
      .getEventStream()
      .filter(
        (event) =>
          event.eventName === 'resize' || event.eventName === 'restored'
      )
      .onValue(() => {
        groupButtonsAndAdjustToolbarPosition(gmailComposeView);
      });
    var el = gmailComposeView.getElement();
    gmailComposeView.getStopper().onValue(function () {
      memberMap.delete(gmailComposeView);
      el.setAttribute('data-button-grouping-managed', 'false');
    });
  }
);

function _handleComposeFullscreenStateChanged(
  gmailComposeView: GmailComposeView
) {
  if (
    gmailComposeView
      .getElement()
      .querySelector('.inboxsdk__compose_groupedActionToolbar')
  ) {
    _ungroupButtons(gmailComposeView);
  }

  groupButtonsAndAdjustToolbarPosition(gmailComposeView);
}

function _ungroupButtons(gmailComposeView: GmailComposeView) {
  const members = get(memberMap, gmailComposeView);
  if (members.groupedToolbarButtonViewController)
    members.groupedToolbarButtonViewController.destroy();
  if (members.formattingToolbarMutationObserver)
    members.formattingToolbarMutationObserver.disconnect();
  const buttonToolbar = members.groupedActionToolbarContainer!
    .firstElementChild as HTMLElement | null;

  if (buttonToolbar) {
    _moveNoOverflowButtonsToContainer(gmailComposeView, buttonToolbar);

    buttonToolbar.remove();
    const composeActionToolbar = querySelector(
      gmailComposeView.getElement(),
      '.inboxsdk__compose_actionToolbar'
    );
    composeActionToolbar.innerHTML = '';
    composeActionToolbar.appendChild(buttonToolbar);
  }
}

function groupButtonsAndAdjustToolbarPosition(
  gmailComposeView: GmailComposeView
) {
  _groupButtonsIfNeeded(gmailComposeView);

  _fixToolbarPosition(gmailComposeView);
}

const groupButtonsIfNeededMap = new WeakSet();

function _groupButtonsIfNeeded(gmailComposeView: GmailComposeView) {
  if (groupButtonsIfNeededMap.has(gmailComposeView)) return;
  groupButtonsIfNeededMap.add(gmailComposeView);
  window.requestAnimationFrame(() => {
    groupButtonsIfNeededMap.delete(gmailComposeView);
    if (gmailComposeView.isDestroyed()) return;

    if (_doButtonsNeedToGroup(gmailComposeView)) {
      var groupedActionToolbarContainer =
        _createGroupedActionToolbarContainer(gmailComposeView);

      var groupToggleButtonViewController =
        _createGroupToggleButtonViewController(gmailComposeView);

      _swapToActionToolbar(gmailComposeView, groupToggleButtonViewController);

      _checkAndSetInitialState(
        gmailComposeView,
        groupToggleButtonViewController
      );

      _startMonitoringFormattingToolbar(
        gmailComposeView,
        groupToggleButtonViewController
      );

      gmailComposeView.getStopper().onValue(function () {
        groupedActionToolbarContainer.remove();
        groupToggleButtonViewController.destroy();
      });
    }
  });
}

function _doButtonsNeedToGroup(gmailComposeView: GmailComposeView): boolean {
  const composeEl = gmailComposeView.getElement();
  if (composeEl.querySelector('.inboxsdk__compose_groupedActionToolbar'))
    return false;

  if (
    composeEl.querySelectorAll(
      '.inboxsdk__composeButton:not([data-no-overflow])'
    ).length < 2
  )
    return false;

  if (areNativeToolbarButtonsGrouped(composeEl)) {
    return true;
  }

  return false;
}

const toolbarButtonStyles = new WeakMap<HTMLElement, CSSStyleDeclaration>();

function areNativeToolbarButtonsGrouped(composeEl: HTMLElement) {
  const nativeButtonsContainer = composeEl.querySelector<HTMLElement>('.bAK');
  const containerWidth = nativeButtonsContainer?.offsetWidth ?? 0;
  const nativeButtons = Array.from(
    nativeButtonsContainer?.querySelectorAll<HTMLElement>('.wG') ?? []
  );

  let buttonsWidth = 0;

  for (const button of nativeButtons) {
    const style = toolbarButtonStyles.get(button) ?? getComputedStyle(button);

    if (!toolbarButtonStyles.has(button)) {
      toolbarButtonStyles.set(button, style);
    }

    const margin = parseFloat(style.marginLeft) + parseFloat(style.marginRight);

    buttonsWidth += button.offsetWidth;
    buttonsWidth += margin;

    if (buttonsWidth > containerWidth) {
      return true;
    }
  }

  return false;
}

function _createGroupedActionToolbarContainer(
  gmailComposeView: GmailComposeView
): HTMLElement {
  var groupedActionToolbarContainer: HTMLElement =
    document.createElement('div');
  groupedActionToolbarContainer.classList.add(
    'inboxsdk__compose_groupedActionToolbar'
  );
  groupedActionToolbarContainer.innerHTML =
    '<div class="inboxsdk__compose_groupedActionToolbar_arrow"> </div>';
  get(memberMap, gmailComposeView).groupedActionToolbarContainer =
    groupedActionToolbarContainer;
  groupedActionToolbarContainer.style.display = 'none';
  return groupedActionToolbarContainer;
}

function _createGroupToggleButtonViewController(
  gmailComposeView: GmailComposeView
) {
  var members = get(memberMap, gmailComposeView);

  var buttonView = _createGroupToggleButtonView();

  var buttonViewController = new BasicButtonViewController({
    buttonView: buttonView,
    activateFunction: function () {
      _toggleGroupButtonToolbar(gmailComposeView, buttonViewController);

      if (_isToggleExpanded()) {
        get(memberMap, gmailComposeView)
          .groupedActionToolbarContainer!.querySelectorAll<HTMLElement>(
            '.inboxsdk__composeButton'
          )[0]
          .focus();
      }
    },
  });
  members.groupedActionToolbarContainer!.addEventListener('keydown', function (
    event: KeyboardEvent
  ) {
    if (event.which === 27) {
      //escape
      buttonViewController.activate();
      buttonView.getElement().focus();
      event.preventDefault();
      event.stopPropagation();
    }
  } as any);
  get(memberMap, gmailComposeView).groupedToolbarButtonViewController =
    buttonViewController;
  return buttonViewController;
}

function _createGroupToggleButtonView() {
  var buttonView = new GmailComposeButtonView({
    tooltip: 'More Tools',
    iconUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAEJGlDQ1BJQ0MgUHJvZmlsZQAAOBGFVd9v21QUPolvUqQWPyBYR4eKxa9VU1u5GxqtxgZJk6XtShal6dgqJOQ6N4mpGwfb6baqT3uBNwb8AUDZAw9IPCENBmJ72fbAtElThyqqSUh76MQPISbtBVXhu3ZiJ1PEXPX6yznfOec7517bRD1fabWaGVWIlquunc8klZOnFpSeTYrSs9RLA9Sr6U4tkcvNEi7BFffO6+EdigjL7ZHu/k72I796i9zRiSJPwG4VHX0Z+AxRzNRrtksUvwf7+Gm3BtzzHPDTNgQCqwKXfZwSeNHHJz1OIT8JjtAq6xWtCLwGPLzYZi+3YV8DGMiT4VVuG7oiZpGzrZJhcs/hL49xtzH/Dy6bdfTsXYNY+5yluWO4D4neK/ZUvok/17X0HPBLsF+vuUlhfwX4j/rSfAJ4H1H0qZJ9dN7nR19frRTeBt4Fe9FwpwtN+2p1MXscGLHR9SXrmMgjONd1ZxKzpBeA71b4tNhj6JGoyFNp4GHgwUp9qplfmnFW5oTdy7NamcwCI49kv6fN5IAHgD+0rbyoBc3SOjczohbyS1drbq6pQdqumllRC/0ymTtej8gpbbuVwpQfyw66dqEZyxZKxtHpJn+tZnpnEdrYBbueF9qQn93S7HQGGHnYP7w6L+YGHNtd1FJitqPAR+hERCNOFi1i1alKO6RQnjKUxL1GNjwlMsiEhcPLYTEiT9ISbN15OY/jx4SMshe9LaJRpTvHr3C/ybFYP1PZAfwfYrPsMBtnE6SwN9ib7AhLwTrBDgUKcm06FSrTfSj187xPdVQWOk5Q8vxAfSiIUc7Z7xr6zY/+hpqwSyv0I0/QMTRb7RMgBxNodTfSPqdraz/sDjzKBrv4zu2+a2t0/HHzjd2Lbcc2sG7GtsL42K+xLfxtUgI7YHqKlqHK8HbCCXgjHT1cAdMlDetv4FnQ2lLasaOl6vmB0CMmwT/IPszSueHQqv6i/qluqF+oF9TfO2qEGTumJH0qfSv9KH0nfS/9TIp0Wboi/SRdlb6RLgU5u++9nyXYe69fYRPdil1o1WufNSdTTsp75BfllPy8/LI8G7AUuV8ek6fkvfDsCfbNDP0dvRh0CrNqTbV7LfEEGDQPJQadBtfGVMWEq3QWWdufk6ZSNsjG2PQjp3ZcnOWWing6noonSInvi0/Ex+IzAreevPhe+CawpgP1/pMTMDo64G0sTCXIM+KdOnFWRfQKdJvQzV1+Bt8OokmrdtY2yhVX2a+qrykJfMq4Ml3VR4cVzTQVz+UoNne4vcKLoyS+gyKO6EHe+75Fdt0Mbe5bRIf/wjvrVmhbqBN97RD1vxrahvBOfOYzoosH9bq94uejSOQGkVM6sN/7HelL4t10t9F4gPdVzydEOx83Gv+uNxo7XyL/FtFl8z9ZAHF4bBsrEwAAADxJREFUOBFjYKASYISa8x/NPJLFmdAMIJs7+Awi2ys000hy7EBdghHLgy+wqeYimgU+2QaPxhrZQUe6RgBYwgkWqJftAwAAAABJRU5ErkJggg==',
  });
  buttonView.addClass('inboxsdk__compose_groupedActionButton');
  buttonView.getElement().setAttribute('tabindex', '1');
  return buttonView;
}

function _swapToActionToolbar(
  gmailComposeView: GmailComposeView,
  buttonViewController: BasicButtonViewController
) {
  const actionToolbar = querySelector(
    gmailComposeView.getElement(),
    '.inboxsdk__compose_actionToolbar > div'
  );
  const actionToolbarContainer: HTMLElement =
    actionToolbar.parentElement as any;
  const newActionToolbar = document.createElement('div');
  newActionToolbar.appendChild(buttonViewController.getView().getElement());
  actionToolbarContainer.appendChild(newActionToolbar);
  const groupedActionToolbarContainer = get(memberMap, gmailComposeView)
    .groupedActionToolbarContainer!;
  groupedActionToolbarContainer.insertBefore(
    actionToolbar,
    groupedActionToolbarContainer.firstElementChild as any
  );
  actionToolbarContainer.appendChild(groupedActionToolbarContainer);

  _moveNoOverflowButtonsToActionToolbar(gmailComposeView);
}

function _moveNoOverflowButtonsToActionToolbar(
  gmailComposeView: GmailComposeView
) {
  const actionToolbar = querySelector(
    gmailComposeView.getElement(),
    '.inboxsdk__compose_actionToolbar > div'
  );

  _moveNoOverflowButtonsToContainer(gmailComposeView, actionToolbar);
}

function _moveNoOverflowButtonsToContainer(
  gmailComposeView: GmailComposeView,
  container: HTMLElement
) {
  const noOverflowButtons = gmailComposeView
    .getElement()
    .querySelectorAll<HTMLElement>(
      '.inboxsdk__composeButton[data-no-overflow]'
    );
  Array.from(noOverflowButtons).forEach((buttonElement) =>
    insertElementInOrder(container, buttonElement, undefined, true)
  );
}

function _checkAndSetInitialState(
  gmailComposeView: GmailComposeView,
  groupToggleButtonViewController: BasicButtonViewController
) {
  if (_isToggleExpanded()) {
    _expandGroupButtonToolbar(
      gmailComposeView,
      groupToggleButtonViewController
    );
  }
}

function _collapseGroupButtonToolbar(
  gmailComposeView: GmailComposeView,
  buttonViewController: BasicButtonViewController
) {
  get(
    memberMap,
    gmailComposeView
  ).groupedActionToolbarContainer!.style.display = 'none';
  gmailComposeView
    .getElement()
    .classList.remove('inboxsdk__compose_groupedActionToolbar_visible');
  buttonViewController.getView().deactivate();
  localStorage['inboxsdk__compose_groupedActionButton_state'] = 'collapsed';
  const bottomToolbarTable = gmailComposeView.getBottomBarTable();
  bottomToolbarTable.style.position = '';
  // when expanding the group button this can change how the body is scrolled
  // in gmail v2 when the body is scrolled Gmail puts a shadow border between the
  // toolbar and the content. We "jiggle" the scroll position by 1px to trigger Gmails
  // logic to show/hide the shadow border
  const bodyScrollContainer = gmailComposeView
    .getElement()
    .querySelector('.qz');

  if (bodyScrollContainer) {
    bodyScrollContainer.scrollTop = bodyScrollContainer.scrollTop - 1;
  }
}

function _expandGroupButtonToolbar(
  gmailComposeView: GmailComposeView,
  buttonViewController: BasicButtonViewController
) {
  get(
    memberMap,
    gmailComposeView
  ).groupedActionToolbarContainer!.style.display = '';
  gmailComposeView
    .getElement()
    .classList.add('inboxsdk__compose_groupedActionToolbar_visible');
  buttonViewController.getView().activate();
  localStorage['inboxsdk__compose_groupedActionButton_state'] = 'expanded';

  _positionGroupToolbar(gmailComposeView);

  const formattingToolbar = gmailComposeView.getFormattingToolbar();

  if (formattingToolbar && formattingToolbar.style.display === '') {
    simulateClick(gmailComposeView.getFormattingToolbarToggleButton());
  }

  // when expanding the group button this can change how the body is scrolled
  // in gmail v2 when the body is scrolled Gmail puts a shadow border between the
  // toolbar and the content. We "jiggle" the scroll position by 1px to trigger Gmails
  // logic to show/hide the shadow border
  const bodyScrollContainer = gmailComposeView
    .getElement()
    .querySelector('.qz');

  if (bodyScrollContainer) {
    bodyScrollContainer.scrollTop = bodyScrollContainer.scrollTop + 1;
  }
}

function _toggleGroupButtonToolbar(
  gmailComposeView: GmailComposeView,
  buttonViewController: BasicButtonViewController
) {
  if (_isToggleExpanded()) {
    _collapseGroupButtonToolbar(gmailComposeView, buttonViewController);
  } else {
    _expandGroupButtonToolbar(gmailComposeView, buttonViewController);
  }
}

function _isToggleExpanded() {
  return (
    localStorage['inboxsdk__compose_groupedActionButton_state'] === 'expanded'
  );
}

const fixToolbarPositionMap = new WeakSet();

function _fixToolbarPosition(gmailComposeView: GmailComposeView) {
  if (fixToolbarPositionMap.has(gmailComposeView)) return;
  fixToolbarPositionMap.add(gmailComposeView);
  window.requestAnimationFrame(() => {
    fixToolbarPositionMap.delete(gmailComposeView);
    if (gmailComposeView.isDestroyed()) return;
    positionFormattingToolbar(gmailComposeView);
    var groupedActionToolbarContainer = gmailComposeView
      .getElement()
      .querySelector<HTMLElement>('.inboxsdk__compose_groupedActionToolbar');

    if (!groupedActionToolbarContainer) {
      return;
    }

    if (groupedActionToolbarContainer.style.display === 'none') {
      return;
    }

    _positionGroupToolbar(gmailComposeView);
  });
}

function _positionGroupToolbar(gmailComposeView: GmailComposeView) {
  if (gmailComposeView.isMinimized()) {
    return;
  }

  var groupedActionToolbarContainer = gmailComposeView
    .getElement()
    .querySelector<HTMLElement>('.inboxsdk__compose_groupedActionToolbar');

  if (!groupedActionToolbarContainer) {
    return;
  }

  const groupedToolbarButton = querySelector(
    gmailComposeView.getElement(),
    '.inboxsdk__compose_groupedActionButton'
  );
  const groupedActionToolbarArrow = querySelector(
    groupedActionToolbarContainer,
    '.inboxsdk__compose_groupedActionToolbar_arrow'
  );
  groupedActionToolbarContainer.style.display = '';

  if (
    groupedToolbarButton.offsetLeft + groupedToolbarButton.clientWidth >
    groupedActionToolbarContainer.offsetWidth
  ) {
    var marginLeft =
      groupedToolbarButton.clientWidth / 2 -
      groupedActionToolbarContainer.offsetWidth / 2 -
      3;
    groupedActionToolbarContainer.style.left =
      groupedToolbarButton.offsetLeft + marginLeft + 'px';
    groupedActionToolbarArrow.style.left = -(marginLeft + 1) + 'px';
  } else {
    groupedActionToolbarContainer.style.left = '';
    groupedActionToolbarArrow.style.left =
      groupedToolbarButton.offsetLeft - 1 + 'px';
  }

  const bottomToolbarTable = gmailComposeView.getBottomBarTable();
  bottomToolbarTable.style.position = 'relative';
  const bottomToolbarHeight = gmailComposeView.getBottomBarTable().clientHeight;
  groupedActionToolbarContainer.style.bottom = `${bottomToolbarHeight + 1}px`;

  if (bottomToolbarHeight < 1) {
    const heElements = gmailComposeView
      .getElement()
      .querySelectorAll<HTMLElement>('td.HE');
    Logger.error(new Error('bottom toolbar had bad height'), {
      bottomToolbarHeight,
      heElementHeights: Array.from(heElements).map((el) => el.clientHeight),
      heElementsHTML: Array.from(heElements).map(censorHTMLtree),
    });
  }
}

function _startMonitoringFormattingToolbar(
  gmailComposeView: GmailComposeView,
  groupToggleButtonViewController: BasicButtonViewController
) {
  waitFor(function () {
    if (gmailComposeView.isDestroyed()) throw 'skip';
    return gmailComposeView.getFormattingToolbar();
  })
    .then((formattingToolbar) => {
      const mutationObserver = new MutationObserver(function (mutations) {
        const target = mutations[0].target;

        if (
          target instanceof HTMLElement &&
          target.style.display === '' &&
          localStorage['inboxsdk__compose_groupedActionButton_state'] ===
            'expanded'
        ) {
          groupToggleButtonViewController.activate();
        }
      });
      mutationObserver.observe(formattingToolbar, {
        attributes: true,
        attributeFilter: ['style'],
      });
      get(memberMap, gmailComposeView).formattingToolbarMutationObserver =
        mutationObserver;
      gmailComposeView
        .getStopper()
        .onValue(() => mutationObserver.disconnect());
    })
    .catch((err) => {
      if (err !== 'skip') {
        Logger.error(err);
        throw err;
      }
    });
}
