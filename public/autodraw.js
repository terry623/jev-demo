// Composition-aware, latest-input-only scheduling. Clock injection keeps races testable.
export class AutoDraw {
  constructor({
    draw,
    cancel,
    waiting = () => {},
    delay = 1000,
    clock = globalThis,
  }) {
    Object.assign(this, { draw, cancel, waiting, delay, clock });
    this.version = 0;
    this.composing = false;
    this.timer = null;
  }
  stop() {
    this.version++;
    this.clock.clearTimeout(this.timer);
    this.timer = null;
    this.cancel();
  }
  input(text) {
    this.stop();
    this.text = text;
    if (this.composing || !text.trim()) return;
    const version = this.version;
    this.waiting();
    this.timer = this.clock.setTimeout(() => {
      this.timer = null;
      if (version === this.version && !this.composing) this.draw(text.trim());
    }, this.delay);
  }
  compositionStart() {
    this.composing = true;
    this.stop();
  }
  compositionEnd(text) {
    this.composing = false;
    this.input(text);
  }
}
