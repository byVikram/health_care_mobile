// src/features/dashboard/symptomCardMeta.ts
//
// How a symptom (from GET /api/specialities/symptoms) looks as a card: its server label, tone and glyph. Shared by Home's "Not feeling well?"
// row and the Symptoms page, so the two always draw a symptom the same way.
//
// - SYMPTOM_META: the six symptoms Home has always shown, keyed by their icon_key. They keep their tones and glyphs; the NAME is always
//   the server's label, the same text the web app shows (never a shortened copy).
//   Home shows its four cards from THESE keys only (see isHomeSymptom), so symptoms added later never change Home.
// - NEW_SYMPTOM_ICONS / SYMPTOM_TAGS: glyphs (24x24 strokes from the "0 · Symptoms" design) and search keywords of the symptoms added by
//   health_care_backend/scripts/seed_symptom_library.py, keyed by the same icon_key. A key not listed here (an admin added a symptom) gets
//   a pulse glyph and a tone from its label.
import { TONES, toneForString, type ToneKey } from '../../config/theme'
import type { SymptomItem } from '../../types/speciality'
import { HOME_ICONS } from './homeTheme'

/** icon_key (symptoms API) -> tone and glyph. */
export const SYMPTOM_META: Record<string, { tone: ToneKey; icon: string }> = {
	acne: { tone: 'peach', icon: HOME_ICONS.skin },
	child: { tone: 'sky', icon: HOME_ICONS.child },
	cough: { tone: 'mint', icon: HOME_ICONS.thermometer },
	depression: { tone: 'lilac', icon: HOME_ICONS.brain },
	pregnancy: { tone: 'sand', icon: HOME_ICONS.female },
	performance: { tone: 'sky', icon: HOME_ICONS.pulse },
}

export const NEW_SYMPTOM_ICONS: Record<string, string> = {
	fever: 'M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0zM12 10v7',
	'dry-cough': 'M4 9h7M3 13h9M4 17h7M15 6c3 1.5 5 3.8 5 6s-2 4.5-5 6',
	head: 'M12 3a7 7 0 0 0-7 7c0 2.6 1.3 4.2 2 5.5V21h7v-3h2a2 2 0 0 0 2-2v-2.5l1.8-.8L18 9a7 7 0 0 0-6-6zM10 9l2 2 2-2',
	ache: 'M12 4a2 2 0 1 0 0 .01M7 21l2-7-3-3 2-3h8l2 3-3 3 2 7M9 11h6',
	tired: 'M3 8h15v8H3zM18 11h3v2h-3M6 11v2',
	skin: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 11h.01M15 11h.01M9.5 15h5M17 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z',
	rash: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9h.01M14 8h.01M15 13h.01M9.5 14h.01M12 11h.01',
	hair: 'M6 21V11a6 6 0 0 1 12 0v10M9 21v-8M12 21v-9M15 21v-8',
	knee: 'M8 2v7a4 4 0 0 0 1 3l-1 10M16 2v7a4 4 0 0 1-1 3l1 10M9 12h6',
	back: 'M12 2v20M9 5h6M8 9h8M9 13h6M8 17h8M10 21h4',
	neck: 'M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 9v4M5 21v-4a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v4',
	joint: 'M6 4a2 2 0 1 0 0 .01M18 20a2 2 0 1 0 0 .01M7.5 5.5L11 9M13 15l3.5 3.5M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
	heart: 'M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.6 12 20 12 20z',
	bp: 'M3 12h4l2-5 4 10 2-5h6',
	palp: 'M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.6 12 20 12 20zM7 12h2l1.5-2 2 4 1.5-2h3',
	drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11zM10 14h4M12 12v4',
	thyroid: 'M8 3v5a4 4 0 0 0 8 0V3M6 21v-3a6 6 0 0 1 12 0v3',
	weight: 'M5 4h14l2 16H3zM9 10a3 3 0 0 1 6 0M12 10l1.5-2',
	stomach: 'M8 3v5a4 4 0 0 0 4 4h1a5 5 0 0 1 5 5v1a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3',
	acid: 'M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3 1-5.5 1-7.5z',
	gut: 'M7 4h10M7 4v4a3 3 0 0 0 3 3h4a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3h-4a3 3 0 0 0-3 3v1',
	brain: HOME_ICONS.brain,
	sleep: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
	mood: 'M7 17a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1.5A4 4 0 1 1 17 17zM9 21l1-2M13 21l1-2',
	female: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 15v7M9 19h6',
	preg: 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM10 21v-6l-2-2 2-4h3a5 5 0 0 1 3 5 3 3 0 0 1-3 3v4',
	'child-unwell': HOME_ICONS.child,
	vaccine: 'M18 2l4 4M17 7l-9 9-3-3 9-9zM7 14l-4 4M3 21l2-2M14 4l6 6',
	ear: 'M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0M10 11a2 2 0 0 1 3-2',
	throat: 'M12 3a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V8a5 5 0 0 0-5-5zM10 16v5M14 16v5',
	nose: 'M12 3v10l-3 3a2 2 0 0 0 2 3h2a2 2 0 0 0 2-3l-3-3',
	eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
	lungs: 'M12 3v8M12 8l-3 3M12 8l3 3M8 7c-3 2-5 6-5 10 0 2 2 3 4 2l3-2V10M16 7c3 2 5 6 5 10 0 2-2 3-4 2l-3-2V10',
	dizzy: 'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1',
	kidney: 'M9 4a4 4 0 0 0-4 4c0 4 2 8 4 8a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zM12 13h3v7',
}

/** Words a patient may type for a symptom (the design's search keywords), by icon_key. The label and the speciality are searched too. */
export const SYMPTOM_TAGS: Record<string, string> = {
	acne: 'skin acne pimples',
	child: 'child kid baby fever',
	cough: 'cold fever temperature flu cough',
	depression: 'stress anxiety panic low mood sad depression',
	pregnancy: 'periods menstrual pcos pregnancy pregnant',
	performance: 'sexual health performance',
	fever: 'cold fever temperature flu',
	'dry-cough': 'cough cold',
	head: 'headache head pain',
	ache: 'body ache pain weakness',
	tired: 'tired fatigue weakness',
	skin: 'skin acne pimples',
	rash: 'rash itching allergy',
	hair: 'hair fall loss dandruff',
	knee: 'knee pain leg',
	back: 'back pain spine',
	neck: 'neck shoulder pain',
	joint: 'joint pain arthritis',
	heart: 'chest pain heart',
	bp: 'blood pressure bp hypertension',
	palp: 'palpitations heartbeat',
	drop: 'diabetes sugar',
	thyroid: 'thyroid',
	weight: 'weight gain obesity',
	stomach: 'stomach pain abdomen',
	acid: 'acidity gas heartburn',
	gut: 'constipation bowel loose motion',
	brain: 'stress anxiety panic',
	sleep: 'sleep insomnia',
	mood: 'low mood sad depression',
	female: 'periods menstrual pcos',
	preg: 'pregnancy pregnant',
	'child-unwell': 'child kid baby fever',
	vaccine: 'vaccine vaccination baby',
	throat: 'throat sore tonsils',
	ear: 'ear pain hearing',
	nose: 'nose sinus blocked',
	eye: 'eye vision red eyes blurred',
	lungs: 'breathing breathless asthma wheezing',
	dizzy: 'dizziness migraine vertigo',
	kidney: 'urine urinary burning',
}

/** A symptom Home has always shown: its icon_key is one of the six in SYMPTOM_META. Home's cards are picked with this. */
export const isHomeSymptom = (s: SymptomItem) => !!s.icon_key && s.icon_key in SYMPTOM_META

/** The card: the server's label, a tone pair and a glyph. The six old symptoms keep their own tone and glyph. */
export const symptomMeta = (s: SymptomItem) => {
	const meta = s.icon_key ? SYMPTOM_META[s.icon_key] : undefined
	if (meta) return { label: s.label, pair: TONES[meta.tone], icon: meta.icon }
	const icon = (s.icon_key && NEW_SYMPTOM_ICONS[s.icon_key]) || HOME_ICONS.pulse
	return { label: s.label, pair: toneForString(s.label), icon }
}

/** Everything the search box looks at for one symptom, lower-cased. */
export const symptomSearchText = (s: SymptomItem) =>
	`${s.label} ${s.speciality_label ?? ''} ${(s.icon_key && SYMPTOM_TAGS[s.icon_key]) || ''}`.toLowerCase()
