import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../apps/mobile/assets/sounds');

const SAMPLE_RATE = 22050;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const BYTE_RATE = SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8); // 44100
const BLOCK_ALIGN = CHANNELS * (BITS_PER_SAMPLE / 8); // 2
const AMPLITUDE = Math.round(0.6 * 32767); // 19660
const RAMP_MS = 5;
const RAMP_SAMPLES = Math.round((RAMP_MS / 1000) * SAMPLE_RATE); // 110

function generateToneSamples(freq, durationSec) {
  const numSamples = Math.round(durationSec * SAMPLE_RATE);
  const samples = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    let ramp = 1.0;
    if (i < RAMP_SAMPLES) {
      ramp = i / RAMP_SAMPLES;
    } else if (i >= numSamples - RAMP_SAMPLES) {
      ramp = (numSamples - 1 - i) / RAMP_SAMPLES;
    }
    const val = Math.round(AMPLITUDE * ramp * Math.sin(2 * Math.PI * freq * (i / SAMPLE_RATE)));
    samples[i] = Math.max(-32768, Math.min(32767, val));
  }

  return samples;
}

function generateSilenceSamples(durationSec) {
  const numSamples = Math.round(durationSec * SAMPLE_RATE);
  return new Int16Array(numSamples);
}

function concatSamples(...arrays) {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Int16Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function buildWavBuffer(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');

  // fmt subchunk
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20); // audio format (PCM = 1)
  buffer.writeUInt16LE(CHANNELS, 22); // num channels
  buffer.writeUInt32LE(SAMPLE_RATE, 24); // sample rate
  buffer.writeUInt32LE(BYTE_RATE, 28); // byte rate
  buffer.writeUInt16LE(BLOCK_ALIGN, 32); // block align
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34); // bits per sample

  // data subchunk
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);

  // PCM samples
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }

  return buffer;
}

fs.mkdirSync(outDir, { recursive: true });

// scan-ok.wav: 1000 Hz, 80 ms
const okSamples = generateToneSamples(1000, 0.08);
const okBuffer = buildWavBuffer(okSamples);
fs.writeFileSync(path.join(outDir, 'scan-ok.wav'), okBuffer);

// scan-error.wav: two 300 Hz tones of 120 ms with 60 ms silence
const errTone1 = generateToneSamples(300, 0.12);
const errSilence = generateSilenceSamples(0.06);
const errTone2 = generateToneSamples(300, 0.12);
const errSamples = concatSamples(errTone1, errSilence, errTone2);
const errBuffer = buildWavBuffer(errSamples);
fs.writeFileSync(path.join(outDir, 'scan-error.wav'), errBuffer);

console.log('Sounds generated successfully:');
console.log(`- scan-ok.wav (${okBuffer.length} bytes)`);
console.log(`- scan-error.wav (${errBuffer.length} bytes)`);
