import { findReplyElement, waitForReplyElement } from './gmail-message-view';

describe('findReplyElement', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  test('returns .M9 element when present', () => {
    const m9 = document.createElement('div');
    m9.className = 'M9';
    const form = document.createElement('form');
    container.appendChild(m9);
    container.appendChild(form);

    expect(findReplyElement(container)).toBe(m9);
  });

  test('falls back to form when no .M9', () => {
    const form = document.createElement('form');
    const other = document.createElement('div');
    container.appendChild(form);
    container.appendChild(other);

    expect(findReplyElement(container)).toBe(form);
  });

  test('falls back to firstElementChild as last resort', () => {
    const child = document.createElement('div');
    child.className = 'some-other-class';
    container.appendChild(child);

    expect(findReplyElement(container)).toBe(child);
  });

  test('returns null when container is empty', () => {
    expect(findReplyElement(container)).toBeNull();
  });
});

describe('waitForReplyElement', () => {
  let replyContainer: HTMLElement;
  let onFound: jest.Mock;
  let onTimeout: jest.Mock;

  beforeEach(() => {
    replyContainer = document.createElement('div');
    replyContainer.classList.add('adB');
    onFound = jest.fn();
    onTimeout = jest.fn();
  });

  function appendReplyElementLater(delay: number) {
    setTimeout(() => {
      const m9 = document.createElement('div');
      m9.className = 'M9';
      replyContainer.appendChild(m9);
    }, delay);
  }

  test('calls onFound when the element appears after a delay', async () => {
    appendReplyElementLater(30);

    await waitForReplyElement({
      replyContainer,
      isStopped: () => false,
      isAlreadyFound: () => false,
      onFound,
      onTimeout,
      timeout: 1000,
      steptime: 10,
    });

    expect(onFound).toHaveBeenCalledTimes(1);
    expect(onFound.mock.calls[0][0].className).toBe('M9');
    expect(onTimeout).not.toHaveBeenCalled();
  });

  test('stops polling immediately when the view is stopped mid-wait', async () => {
    const isStopped = jest
      .fn<boolean, []>()
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    // The generous timeout would hang this test past its own timeout if
    // stopping did not abort the poll early.
    await waitForReplyElement({
      replyContainer,
      isStopped,
      isAlreadyFound: () => false,
      onFound,
      onTimeout,
      timeout: 60 * 1000,
      steptime: 10,
    });

    expect(isStopped).toHaveBeenCalledTimes(2);
    expect(onFound).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  test('does not call onFound when the adB class was removed mid-wait', async () => {
    setTimeout(() => {
      replyContainer.classList.remove('adB');
    }, 20);
    appendReplyElementLater(30);

    await waitForReplyElement({
      replyContainer,
      isStopped: () => false,
      isAlreadyFound: () => false,
      onFound,
      onTimeout,
      timeout: 1000,
      steptime: 10,
    });

    expect(onFound).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  test('does not call onFound when the element was already found', async () => {
    const m9 = document.createElement('div');
    m9.className = 'M9';
    replyContainer.appendChild(m9);

    await waitForReplyElement({
      replyContainer,
      isStopped: () => false,
      isAlreadyFound: () => true,
      onFound,
      onTimeout,
      timeout: 1000,
      steptime: 10,
    });

    expect(onFound).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  test('calls onTimeout when the element never appears', async () => {
    await waitForReplyElement({
      replyContainer,
      isStopped: () => false,
      isAlreadyFound: () => false,
      onFound,
      onTimeout,
      timeout: 50,
      steptime: 10,
    });

    expect(onFound).not.toHaveBeenCalled();
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onTimeout.mock.calls[0][0]).toMatchObject({
      message: 'waitFor timeout',
    });
  });
});
