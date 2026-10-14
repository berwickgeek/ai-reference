# TTS place names

Place names that a text-to-speech voice says wrongly, with IPA that makes it say them right. Every entry was checked by ear on the voice named in its row.

There was no open list of this when we looked (October 2026). Wikidata's IPA property had none of the 20 names we sampled, and WikiPron (IPA from Wiktionary) had 3 of 17, without stress marks.

## The data

`places.csv`, one row per name:

| Column | Meaning |
|---|---|
| `name` | The name as it is written |
| `word` | The part of the name the voice gets wrong, which is what to replace (for "New Caledonia" it is "Caledonia") |
| `ipa` | Broad American-English IPA, primary stress `ˈ` directly before the stressed vowel |
| `sounds_like` | A plain-English respelling, stressed syllable in capitals |
| `country`, `what` | Where and what the place is |
| `voice` | The voice the entry was checked on |
| `checked` | When it was checked |

The IPA is written for an American-trained English voice speaking English, so it is how an English speaker would say the name, not always how a local would.

## Using it with Deepgram Aura-2

Put Aura-2's inline override in place of `word`, in the text you send to `/v1/speak`:

```
We arrive in \{"word": "Papeete", "pronounce": "pɑːpiːˈeɪtiː"\} at 8 am.
```

The response header `dg-pronunciations-applied` counts the overrides the voice took, and `dg-warnings` reports bad IPA (`PRON-008` is a stress mark before a consonant). The IPA is not billed. Aura-2 does not follow an override every time, so generate a name that matters several times on your voice before you rely on it. See Deepgram's [Speed, Pause, Pronunciation](https://developers.deepgram.com/docs/tts-voice-controls) page.

Match names with their case as written: "Hue" the city, not "hue" the colour.

Other engines take IPA through SSML (`<phoneme alphabet="ipa" ph="...">`) or a pronunciation lexicon. The same IPA is a starting point there, but it has only been checked on the voice in each row.

## Finding more

`scripts/screen.mjs` speaks a list of names on an Aura-2 voice, transcribes each clip with nova-3 with and without the name as a keyterm, and sorts the names into "likely wrong", "listen" and "fine". It is a screen, not a judge: the transcriber makes its own mistakes, so listen before adding anything. Screening 852 names cost about US$1.50.

## Adding an entry

Open a pull request with the row. Say which voice you checked it on, and only add a name after hearing the voice say it right with your IPA more than once.

## Licence

The data (`places.csv`) is dedicated to the public domain under [CC0 1.0](../LICENSE): use it for anything, no credit needed. The scripts are under the [MIT licence](../LICENSE-CODE). Nothing here is copied from Wiktionary or WikiPron, whose CC BY-SA terms would otherwise apply.
