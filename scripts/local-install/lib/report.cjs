'use strict';
/**
 * scripts/local-install/lib/report.cjs
 *
 * Progress + summary reporting for the local-install platform. Pure formatting
 * over an injectable sink (default: process.stdout), so tests capture output
 * by passing their own `write`. Colour auto-disables when not a TTY or when
 * NO_COLOR / --no-color is set.
 */

const SYMBOLS = {
  ok: '✓',
  fail: '✗',
  warn: '⚠',
  skip: '⊘',
  run: '▶',
  dot: '·',
  info: 'ℹ',
};

const COLORS = {
  green: '32',
  red: '31',
  yellow: '33',
  gray: '90',
  cyan: '36',
  bold: '1',
};

class Reporter {
  /**
   * @param {object} opts
   * @param {(s:string)=>void} [opts.write] - output sink (default stdout)
   * @param {boolean} [opts.color] - force colour on/off (default: auto)
   * @param {boolean} [opts.json] - suppress human output (caller emits JSON)
   */
  constructor(opts = {}) {
    this.write = opts.write || ((s) => process.stdout.write(s));
    this.json = opts.json === true;
    if (typeof opts.color === 'boolean') {
      this.useColor = opts.color;
    } else {
      this.useColor = !process.env.NO_COLOR && !!(process.stdout && process.stdout.isTTY);
    }
    this.lines = []; // captured for testing / json fallback
  }

  _color(code, text) {
    if (!this.useColor) return text;
    return `\x1b[${code}m${text}\x1b[0m`;
  }

  _emit(line) {
    this.lines.push(line);
    if (!this.json) this.write(line + '\n');
  }

  banner(text) {
    this._emit('');
    this._emit(this._color(COLORS.bold, this._color(COLORS.cyan, `══ ${text} `.padEnd(64, '═'))));
  }

  header(text) {
    this._emit('');
    this._emit(this._color(COLORS.bold, `── ${text}`));
  }

  /** A numbered progress line printed BEFORE a step runs: `[3/9] ▶ label`. */
  startStep(index, total, label) {
    const counter = this._color(COLORS.gray, `[${index}/${total}]`);
    this._emit(`${counter} ${this._color(COLORS.cyan, SYMBOLS.run)} ${label}`);
  }

  /** Result line printed AFTER a step: `[3/9] ✓ label  (detail)`. */
  endStep(index, total, status, label, detail) {
    const counter = this._color(COLORS.gray, `[${index}/${total}]`);
    let sym;
    if (status === 'ok') sym = this._color(COLORS.green, SYMBOLS.ok);
    else if (status === 'warn') sym = this._color(COLORS.yellow, SYMBOLS.warn);
    else if (status === 'skip') sym = this._color(COLORS.gray, SYMBOLS.skip);
    else sym = this._color(COLORS.red, SYMBOLS.fail);
    const tail = detail ? this._color(COLORS.gray, `  ${detail}`) : '';
    this._emit(`${counter} ${sym} ${label}${tail}`);
  }

  ok(text) { this._emit(`  ${this._color(COLORS.green, SYMBOLS.ok)} ${text}`); }
  fail(text) { this._emit(`  ${this._color(COLORS.red, SYMBOLS.fail)} ${text}`); }
  warn(text) { this._emit(`  ${this._color(COLORS.yellow, SYMBOLS.warn)} ${text}`); }
  skip(text) { this._emit(`  ${this._color(COLORS.gray, SYMBOLS.skip)} ${text}`); }
  info(text) { this._emit(`  ${this._color(COLORS.gray, SYMBOLS.dot)} ${text}`); }
  note(text) { this._emit(`    ${this._color(COLORS.gray, text)}`); }
  plain(text) { this._emit(text); }

  /** Final verdict line. `kind` ∈ ok | warn | fail. */
  verdict(kind, text) {
    this._emit('');
    this._emit(this._color(COLORS.bold, '─'.repeat(64)));
    if (kind === 'ok') this._emit(`${this._color(COLORS.green, SYMBOLS.ok)} ${this._color(COLORS.bold, this._color(COLORS.green, text))}`);
    else if (kind === 'warn') this._emit(`${this._color(COLORS.yellow, SYMBOLS.warn)} ${this._color(COLORS.bold, this._color(COLORS.yellow, text))}`);
    else this._emit(`${this._color(COLORS.red, SYMBOLS.fail)} ${this._color(COLORS.bold, this._color(COLORS.red, text))}`);
  }

  captured() { return this.lines.join('\n'); }
}

module.exports = { Reporter, SYMBOLS, COLORS };
