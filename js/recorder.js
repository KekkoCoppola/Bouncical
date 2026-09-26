/* ========== Bouncical — recorder.js ========== */
/* Records the stage canvas + the master audio bus into a video file.
   MP4 where the browser supports it (Safari, recent Chrome), else WebM. */

import { stage, layout } from './stage.js';
import { unlock, recordingStream } from './audio.js';

const TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export const rec = { active: false, startedAt: 0, recorder: null, chunks: [], mime: '' };

export function canRecord() {
  return !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
}

function pickType() {
  for (const t of TYPES) {
    try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (_) {}
  }
  return '';
}

export async function startRecording() {
  if (rec.active || !canRecord()) return false;
  await unlock();
  // Render at least 1080 px on the short side while recording.
  stage.minShortPx = 1080;
  layout(true);
  const stream = stage.canvas.captureStream(60);
  const audio = recordingStream();
  if (audio) audio.getAudioTracks().forEach(t => stream.addTrack(t));
  const mime = pickType();
  const shortPx = Math.min(stage.canvas.width, stage.canvas.height);
  const opts = { videoBitsPerSecond: shortPx >= 1000 ? 10_000_000 : 6_000_000, audioBitsPerSecond: 192_000 };
  if (mime) opts.mimeType = mime;
  let mr;
  try { mr = new MediaRecorder(stream, opts); } catch (e) {
    try { mr = new MediaRecorder(stream); } catch (e2) { stage.minShortPx = 0; layout(true); throw e2; }
  }
  rec.chunks = [];
  rec.mime = mr.mimeType || mime || 'video/webm';
  mr.ondataavailable = e => { if (e.data && e.data.size) rec.chunks.push(e.data); };
  mr.start(250);
  rec.recorder = mr;
  rec.stream = stream;
  rec.active = true;
  rec.startedAt = performance.now();
  return true;
}

export function stopRecording() {
  return new Promise(resolve => {
    const mr = rec.recorder;
    if (!rec.active || !mr) { resolve(null); return; }
    mr.onstop = () => {
      rec.stream.getVideoTracks().forEach(t => t.stop());
      const blob = new Blob(rec.chunks, { type: rec.mime.split(';')[0] });
      rec.active = false;
      rec.recorder = null;
      rec.chunks = [];
      stage.minShortPx = 0;
      layout(true);
      resolve(blob);
    };
    try { mr.requestData(); } catch (_) {}
    mr.stop();
  });
}

export const recordingSeconds = () => (rec.active ? (performance.now() - rec.startedAt) / 1000 : 0);

export function fileNameFor(blob) {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  return `bouncical-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${ext}`;
}
