export const WINDOW_SECONDS = 120;
export class RingBuffer {
  constructor(size) { this.data = new Float32Array(size); this.cursor = 0; this.length = 0; }
  push(samples) {
    for (const sample of samples) { this.data[this.cursor] = sample; this.cursor = (this.cursor + 1) % this.data.length; }
    this.length = Math.min(this.data.length, this.length + samples.length);
  }
  snapshot() {
    const output = new Float32Array(this.length);
    const start = (this.cursor - this.length + this.data.length) % this.data.length;
    for (let i = 0; i < this.length; i++) output[i] = this.data[(start + i) % this.data.length];
    return output;
  }
}
export function wav(samples, rate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer);
  const str = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  str(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  str(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * (s < 0 ? 32768 : 32767), true));
  return new Blob([buffer], {type: 'audio/wav'});
}
