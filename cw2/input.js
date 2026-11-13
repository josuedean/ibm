const MOVEMENT = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);

export class Input {
  constructor(root, isActive) {
    this.keys = new Set();
    this.pointers = new Map();
    this.buttons = [...root.querySelectorAll('[data-control]')];
    window.addEventListener('keydown', event => {
      if (!MOVEMENT.has(event.code) || !isActive() || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    for (const button of this.buttons) {
      button.addEventListener('pointerdown', event => {
        if (!isActive()) return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.pointers.set(event.pointerId, button.dataset.control);
        this.refreshButtons();
      });
      const release = event => {
        this.pointers.delete(event.pointerId);
        this.refreshButtons();
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
    }
  }

  refreshButtons() {
    for (const button of this.buttons) {
      button.classList.toggle('pressed', [...this.pointers.values()].includes(button.dataset.control));
    }
  }

  read() {
    const down = (...codes) => codes.some(code => this.keys.has(code));
    const held = new Set(this.pointers.values());
    return {
      x: Number(down('KeyD', 'ArrowRight') || held.has('right'))
        - Number(down('KeyA', 'ArrowLeft') || held.has('left')),
      y: Number(down('KeyS', 'ArrowDown') || held.has('down'))
        - Number(down('KeyW', 'ArrowUp') || held.has('up')),
      run: down('ShiftLeft', 'ShiftRight') || held.has('sprint'),
    };
  }

  clear() {
    this.keys.clear();
    this.pointers.clear();
    this.refreshButtons();
  }
}
