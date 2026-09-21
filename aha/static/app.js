import {put, all} from './store.js';
import {wav, WINDOW_SECONDS} from './audio-core.js';
const $ = id => document.getElementById(id);
let recording = false;
let access = '';
try { access = sessionStorage.getItem('aha-access') || ''; } catch {}
const authHeaders = () => ({Authorization: 'Bearer ' + access});
$('key').value = access;
$('unlock').onclick = async () => {
  access = $('key').value.trim();
  if (!access) { $('auth').textContent = '请先输入访问码（只复制文件中的第二行）。'; return; }
  const button = $('unlock'); button.disabled = true; button.textContent = '验证中…';
  $('auth').textContent = '正在连接云端，最多等待 20 秒…';
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch('/api/health', {headers:authHeaders(), signal:controller.signal, cache:'no-store'});
    if (!response.ok) {
      $('auth').textContent = response.status === 401 ? '访问码不正确，请只复制文件第二行，不要复制标题。' : `云端暂时不可用（${response.status}），请稍后重试。`;
      return;
    }
    const data = await response.json();
    $('auth').textContent = data.ready ? '✓ 已解锁。下一步：点击下方「开启麦克风」。' : '访问码正确，但云端 AI 服务未配置。';
    try {sessionStorage.setItem('aha-access', access);} catch {}
    button.textContent = '已解锁';
  } catch (error) {
    $('auth').textContent = error.name === 'AbortError' ? '连接超时，请检查网络后重试；不是访问码错误。' : '无法连接云端，请检查网络或刷新页面后重试。';
  } finally { clearTimeout(timeout); button.disabled = false; if(button.textContent !== '已解锁')button.textContent = '重新解锁'; }
};
$('key').addEventListener('keydown', event => {if(event.key === 'Enter')$('unlock').click();});

let context, stream, recorder, source, seconds = 0, starting = false, total = 0;
const urls = new Set();
function url(blob) { const value = URL.createObjectURL(blob); urls.add(value); return value; }
function reset() { seconds = 0; $('capture').disabled = true; $('fill').style.width = '0'; $('buffer').textContent = '0.0 秒已缓冲'; }
async function stop() {
  const old = context; context = null;
  stream?.getTracks().forEach(t => t.stop()); recorder?.disconnect(); source?.disconnect();
  if (old && old.state !== 'closed') await old.close();
  reset(); $('toggle').textContent = '开启麦克风'; $('status').textContent = '○ 麦克风未开启';
}
$('toggle').onclick = async () => {
  if (starting) return;
  if (context) { if(recording){$('message').textContent='请先结束并保存当前灵感，再关闭麦克风。';return;}await stop(); return; }
  starting = true; $('toggle').disabled = true; $('message').textContent = '';
  try {
    stream = await navigator.mediaDevices.getUserMedia({audio: {channelCount: 1}, video: false});
    context = new AudioContext({sampleRate:16000}); await context.resume();
    await context.audioWorklet.addModule('/static/recorder.js');
    recorder = new AudioWorkletNode(context, 'aha-recorder');
    source = context.createMediaStreamSource(stream); source.connect(recorder); recorder.connect(context.destination);
    recorder.port.onmessage = ({data}) => {
      if (!context) return;
      if (data.type === 'status') {
        seconds = data.seconds; $('fill').style.width = `${seconds / WINDOW_SECONDS * 100}%`;
        $('status').textContent = data.recording ? `● 保留中 · ${data.captured.toFixed(0)} 秒` : `● 持续聆听 · 音量 ${Math.min(100, Math.round(data.level * 500))}%`;
        $('buffer').textContent = seconds >= WINDOW_SECONDS ? '持续更新中 · 保留最近 2 分钟' : `${seconds.toFixed(1)} 秒已缓冲`;
        $('capture').disabled = seconds < .1 || context.state !== 'running';
      } else if(data.type === 'started'){recording=true;$('capture').textContent='结束并保存 ↗';}
      else if (data.type === 'capture'){recording=false;$('capture').textContent='Capture Aha! ↗';createNote(wav(data.samples, data.rate), data.samples.length / data.rate);}
    };
    context.onstatechange = () => {
      if (context && context.state !== 'running') { $('capture').disabled = true; $('status').textContent = '○ 录音已中断，请关闭后重新开启麦克风'; }
    };
    stream.getAudioTracks()[0].onended = () => { stop(); $('message').textContent = '麦克风连接已断开，请重新开启。'; };
    $('toggle').textContent = '关闭麦克风'; $('status').textContent = '● 正在聆听 · 本地缓冲中';
  } catch (error) {
    await stop(); $('message').textContent = error.name === 'NotAllowedError' ? '麦克风权限未开启，请在浏览器地址栏允许麦克风后重试。' : '麦克风启动失败，请确认设备可用并使用 localhost 或 HTTPS 访问。';
  } finally { starting = false; $('toggle').disabled = false; }
};
$('capture').onclick = () => { if(!access){$('message').textContent='请先输入私人访问码。';return;} if (seconds >= .1) recorder.port.postMessage('capture'); };
function element(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
function renderText(node, text) {
  node.replaceChildren();
  for (const part of text.split(/(https?:\/\/[^\s<>\]\)]+)/g)) {
    if (/^https?:\/\//.test(part)) { const a = element('a', '', part); a.href = part; a.target = '_blank'; a.rel = 'noopener noreferrer'; node.append(a); }
    else node.append(document.createTextNode(part));
  }
}
async function createNote(blob, duration, restored = null) {
  const entry = restored || {id:crypto.randomUUID(), time:Date.now(), blob, duration};
  if(!restored){try{await put(entry);}catch{$('message').textContent='本地存储空间不足，请立即下载音频，刷新会丢失此条记录。';}}
  const captured = new Date(entry.time), card = element('article', 'note');
  const title = element('h3', '', `${captured.toLocaleString('zh-CN')} · 捕捉了 ${duration.toFixed(1)} 秒`);
  const progress = element('p', 'progress'), transcript = element('div', 'text'), note = element('div', 'text'), warning = element('p', 'warning');
  progress.setAttribute('role', 'status');
  const actions = element('div', 'actions'), retry = element('button', 'action', '重试'), download = element('a', 'action', '下载音频'), save = element('button', 'action', '下载笔记');
  const audioURL = url(blob); download.href = audioURL; download.download = `aha-${captured.getTime()}.wav`;
  const player = element('audio'); player.controls = true; player.src = audioURL;
  retry.hidden = true; save.hidden = true; actions.append(download, retry, save);
  card.append(title, progress, player, element('h4', '', '原始转录'), transcript, element('h4', '', '灵感与研究'), note, warning, actions);
  $('results').prepend(card); $('empty').hidden = true; $('count').textContent = `${++total} 条捕捉`;
  let savedText = '';
  save.onclick = () => { const a = element('a'); a.href = url(new Blob([savedText], {type:'text/markdown;charset=utf-8'})); a.download = `aha-${captured.getTime()}.md`; a.click(); };
  const run = async () => {
    retry.hidden = true; warning.textContent = ''; const started = performance.now();
    const tick = () => { progress.textContent = `已捕捉，正在转写与研究 · ${Math.floor((performance.now() - started)/1000)} 秒`; };
    tick(); const timer = setInterval(tick, 1000), controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);
    try {
      entry.uploadID ||= crypto.randomUUID();
      try { await put(entry); } catch { /* The original blob remains available for export. */ }
      const chunkSize = 512 * 1024;
      for (let offset = 0, index = 0; offset < blob.size; offset += chunkSize, index++) {
        const part = await fetch(`/api/uploads/${entry.uploadID}/chunks/${index}?total_bytes=${blob.size}`, {
          method: 'PUT', body: blob.slice(offset, offset + chunkSize), headers: authHeaders(), signal: controller.signal
        });
        if (!part.ok) {
          const error = await part.json().catch(() => ({}));
          throw new Error(error.detail || `分块上传失败（${part.status}），请重试。`);
        }
      }
      const response = await fetch(`/api/uploads/${entry.uploadID}/complete`, {method: 'POST', headers:authHeaders(), signal:controller.signal});
      const data = await response.json(); if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : '请求失败，请重试。');
      Object.assign(entry, {result:data});try{await put(entry);}catch{warning.textContent='无法保存到浏览器，请下载笔记。';}
      transcript.textContent = data.transcript || '未识别到语音'; renderText(note, data.note || '暂无摘要'); warning.textContent = data.warning;
      progress.textContent = `处理完成 · ${data.elapsed} 秒`; retry.hidden = !data.warning;
      savedText = `# Aha! ${captured.toLocaleString('zh-CN')}\n\n## 原始转录\n${data.transcript}\n\n${data.note}\n\n${data.warning || ''}`; save.hidden = false;
    } catch (error) { progress.textContent = '处理未完成 · 音频已保留在本页'; warning.textContent = error.name === 'AbortError' ? '处理超时，请重试。' : error.message; retry.hidden = false; }
    finally { clearInterval(timer); clearTimeout(timeout); }
  };
  retry.onclick = run;
  if(restored){
    const data=entry.result;
    if(data){transcript.textContent=data.transcript;renderText(note,data.note||'暂无摘要');warning.textContent=data.warning||'';progress.textContent='已从本地恢复';savedText=`# Aha! ${captured.toLocaleString()}\n\n${data.transcript}\n\n${data.note}`;save.hidden=false;retry.hidden=!data.warning;}
    else {progress.textContent='音频已恢复 · 点击重试继续处理';retry.hidden=false;}
  }else run();
}
fetch('/api/health',{headers:authHeaders()}).then(r => r.json()).then(data => { if (!data.ready) $('message').textContent = '服务端尚未配置 API Key，请先完成配置。'; }).catch(() => $('message').textContent = '无法连接本地服务。');
window.addEventListener('pagehide', () => { stream?.getTracks().forEach(t => t.stop()); urls.forEach(u => URL.revokeObjectURL(u)); });

all().then(entries=>{for(const entry of entries.sort((a,b)=>a.time-b.time))createNote(entry.blob,entry.duration,entry);}).catch(()=>$('message').textContent='浏览器持久存储不可用，请下载保存重要记录。');

window.addEventListener('beforeunload',event=>{if(recording){event.preventDefault();event.returnValue='';}});
