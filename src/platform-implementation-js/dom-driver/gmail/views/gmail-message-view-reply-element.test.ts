import waitFor from '../../../lib/wait-for';

// Tests for the inline reply element detection fix (#1281).
// Validates the findReplyElement selector priority and the waitFor-based
// retry used when the compose element is not yet in the DOM when the
// adB class is first added to the reply container.

// Replicate the findReplyElement logic from #setupReplyStream.
function findReplyElement(container: HTMLElement): HTMLElement | null {
  return (container.getElementsByClassName('M9')?.[0] ||
    container.querySelector<HTMLElement>('[role="dialog"]') ||
    container.querySelector<HTMLElement>('form') ||
    container.firstElementChild) as HTMLElement | null;
}

describe('findReplyElement selector priority', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  test('returns .M9 element when present', () => {
    const m9 = document.createElement('div');
    m9.className = 'M9';
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    container.appendChild(m9);
    container.appendChild(dialog);

    expect(findReplyElement(container)).toBe(m9);
  });

  test('falls back to [role=dialog] when no .M9', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const form = document.createElement('form');
    container.appendChild(dialog);
    container.appendChild(form);

    expect(findReplyElement(container)).toBe(dialog);
  });

  test('falls back to form when no .M9 or [role=dialog]', () => {
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

describe('inline reply waitFor retry behavior', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  test('waitFor resolves when compose element appears after delay', async () => {
    // Simulate the element appearing 50ms after adB class is set
    setTimeout(() => {
      const m9 = document.createElement('div');
      m9.className = 'M9';
      container.appendChild(m9);
    }, 50);

    const result = await waitFor(() => findReplyElement(container), 1000, 25);
    expect(result).toBeInstanceOf(HTMLElement);
    expect((result as HTMLElement).className).toBe('M9');
  });

  test('waitFor rejects when compose element never appears within timeout', async () => {
    await expect(
      waitFor(() => findReplyElement(container), 100, 25),
    ).rejects.toThrowError('waitFor timeout');
  });

  test('waitFor resolves immediately when element already present', async () => {
    const m9 = document.createElement('div');
    m9.className = 'M9';
    container.appendChild(m9);

    const result = await waitFor(() => findReplyElement(container), 1000, 25);
    expect(result).toBe(m9);
  });
});
