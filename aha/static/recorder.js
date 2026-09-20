import {RingBuffer, WINDOW_SECONDS} from './audio-core.js';
class Recorder extends AudioWorkletProcessor {
  constructor() {
    super(); this.ring = new RingBuffer(Math.round(sampleRate * WINDOW_SECONDS)); this.ticks = 0; this.chunks = null; this.count = 0;
    this.port.onmessage = ({data}) => {
      if (data === 'capture') {
        if (this.chunks) this.finish();
        else {
          const before = this.ring.snapshot(); this.chunks = [before]; this.count = before.length;
          this.port.postMessage({type:'started'});
        }
      } else if (data === 'finish' && this.chunks) this.finish();
    };
  }
  finish() {
    const samples = new Float32Array(this.count); let offset = 0;
    for (const chunk of this.chunks) {samples.set(chunk, offset); offset += chunk.length;}
    this.chunks = null; this.count = 0;
    this.port.postMessage({type:'capture', samples, rate:sampleRate}, [samples.buffer]);
  }
  process(inputs) {
    const channels = inputs[0];
    if (channels?.length) {
      const mono = new Float32Array(channels[0].length);
      for (const channel of channels) for (let i=0;i<mono.length;i++) mono[i] += channel[i]/channels.length;
      this.ring.push(mono);
      if (this.chunks) { const chunk=mono.slice(0,Math.max(0,Math.round(sampleRate*600)-this.count)); this.chunks.push(chunk);this.count+=chunk.length;if(this.count>=sampleRate*600)this.finish(); }
      if (++this.ticks%20===0)this.port.postMessage({type:'status',seconds:this.ring.length/sampleRate,recording:!!this.chunks,captured:this.count/sampleRate,level:Math.sqrt(mono.reduce((a,x)=>a+x*x,0)/mono.length)});
    }
    return true;
  }
}
registerProcessor('aha-recorder',Recorder);
