// Finds names a Deepgram Aura-2 voice is likely to say wrongly.
//
// Each name is spoken twice in "Next stop, <name>." and each clip is transcribed by nova-3, with
// no hints and then with the name as a keyterm. A name said well usually comes back once the
// keyterm is there; one that fails both keyterm runs is likely wrong, one that fails once is worth
// a listen. A flag is only a reason to listen: the transcriber makes its own mistakes.
//
//   DEEPGRAM_API_KEY=... node scripts/screen.mjs names.txt results.json
//
// names.txt has one name per line. DEEPGRAM_HOST (default api.deepgram.com) and VOICE (default
// aura-2-theia-en) are optional. Clips are written to ./clips.
import fs from 'node:fs';

const KEY = process.env.DEEPGRAM_API_KEY;
const HOST = `https://${process.env.DEEPGRAM_HOST ?? 'api.deepgram.com'}`;
const VOICE = process.env.VOICE ?? 'aura-2-theia-en';
const [input, output] = process.argv.slice(2);
if (!KEY || !input || !output) {
  console.error('usage: DEEPGRAM_API_KEY=... node scripts/screen.mjs names.txt results.json');
  process.exit(1);
}
const names = fs.readFileSync(input, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
fs.mkdirSync('clips', { recursive: true });

/** Letters only, accents dropped: "George Town" and "georgetown" are the same name. */
const letters = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
const heardAs = (transcript, name) => letters(transcript).includes(letters(name));

/** Deepgram answers 429 when too many requests run at once: wait and try again. */
async function retry(request) {
  for (let wait = 1000; ; wait *= 2) {
    const res = await request();
    if (res.status !== 429 || wait > 16000) return res;
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
}

async function speak(text) {
  const res = await retry(() =>
    fetch(`${HOST}/v1/speak?model=${VOICE}&encoding=mp3`, {
      method: 'POST',
      headers: { Authorization: `Token ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }),
  );
  if (!res.ok) throw new Error(`speak answered ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function transcribe(audio, keyterm) {
  const hint = keyterm ? `&keyterm=${encodeURIComponent(keyterm)}` : '';
  const res = await retry(() =>
    fetch(`${HOST}/v1/listen?model=nova-3&punctuate=false${hint}`, {
      method: 'POST',
      headers: { Authorization: `Token ${KEY}`, 'Content-Type': 'audio/mpeg' },
      body: audio,
    }),
  );
  if (!res.ok) throw new Error(`listen answered ${res.status}`);
  return (await res.json()).results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
}

async function check(name, index) {
  const runs = [];
  for (const take of [0, 1]) {
    const audio = await speak(`Next stop, ${name}.`);
    const clip = `clips/${String(index).padStart(4, '0')}_${take}.mp3`;
    fs.writeFileSync(clip, audio);
    runs.push({ clip, plain: await transcribe(audio), keyterm: await transcribe(audio, name) });
  }
  const misses = runs.filter((r) => !heardAs(r.keyterm, name)).length;
  const verdict = misses === 2 ? 'likely wrong' : misses === 1 ? 'listen' : 'fine';
  return { name, verdict, runs };
}

const results = [];
for (let i = 0; i < names.length; i += 4) {
  const batch = names.slice(i, i + 4).map((name, k) => check(name, i + k).catch((err) => ({ name, verdict: 'error', error: String(err) })));
  results.push(...(await Promise.all(batch)));
}
fs.writeFileSync(output, JSON.stringify(results, null, 1));
const count = (verdict) => results.filter((r) => r.verdict === verdict).length;
console.log(`${results.length} names: ${count('likely wrong')} likely wrong, ${count('listen')} to listen to, ${count('error')} errors`);
