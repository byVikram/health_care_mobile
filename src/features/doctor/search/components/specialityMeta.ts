// Visual metadata (icon path, hint, search tags) for specialities returned by
// getSpecialities(). The API only gives `label` / `icon_key`, so we best-effort
// match on the label; anything unknown falls back to a stethoscope with no hint.

const I = {
	steth: 'M6 3v6a4 4 0 0 0 8 0V3M10 13v3a5 5 0 0 0 10 0v-2M20 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
	drop: 'M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11zM9.5 14.5a2.5 2.5 0 0 0 2.5 2.5',
	heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10zM7 12h3l1.5-3 2 5 1.5-2H17',
	skin: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z',
	child: 'M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 22v-6l-2-5h12l-2 5v6M9 22h6',
	woman: 'M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13v8M9 18h6',
	bone: 'M7 17l10-10M5 15a2 2 0 1 0 2 4 2 2 0 1 0 4-2M19 9a2 2 0 1 0-2-4 2 2 0 1 0-4 2',
	ear: 'M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0M10 9a2 2 0 0 1 4 0',
	tooth: 'M7 3c-2 0-3 2-3 4 0 3 1 5 2 8s1 6 3 6 2-5 3-5 1 5 3 5 2-3 3-6 2-5 2-8c0-2-1-4-3-4s-3 1-5 1-3-1-5-1z',
	brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1',
	mind: 'M4 12a8 8 0 1 1 16 0 8 8 0 0 1-16 0zM9 10h.01M15 10h.01M9 15c1.5 1.5 4.5 1.5 6 0',
	stomach: 'M9 3v4c0 2-3 3-3 7a6 6 0 0 0 12 0c0-3-2-4-4-4s-3 1-3 3',
	lungs: 'M12 4v8M12 12l-3-2M12 12l3-2M8 8c-3 1-4 5-4 9 0 2 2 3 4 2 2-1 2-3 2-6V9M16 8c3 1 4 5 4 9 0 2-2 3-4 2-2-1-2-3-2-6V9',
	eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
	kidney: 'M9 4c-3 0-5 3-5 7s2 9 5 9 3-3 3-5-2-2-2-4 2-2 2-4-1-3-3-3zM15 4c3 0 5 3 5 7s-2 9-5 9',
	physio: 'M13 4a2 2 0 1 0 0 .01M8 21l3-7 3 2v5M6 12l4-3 4 1 3 3M11 14l-1-5',
}

type Meta = { match: RegExp; icon: string; hint: string; tags: string }

// Order matters: more specific patterns first (e.g. dentist before ENT/ortho).
const META: Meta[] = [
	{ match: /dent|tooth|orthodont/, icon: I.tooth, hint: 'Teeth, gums', tags: 'tooth teeth gum dental' },
	{ match: /\bent\b|otolaryn|\bear\b/, icon: I.ear, hint: 'Ear, nose, throat', tags: 'ear nose throat sinus' },
	{ match: /physio|rehab/, icon: I.physio, hint: 'Pain, rehab', tags: 'back pain rehab sports injury' },
	{
		match: /general|physician|family medicine|internal medicine/,
		icon: I.steth,
		hint: 'Fever, cold, BP',
		tags: 'fever cold cough bp infection',
	},
	{ match: /diabet|endocrin/, icon: I.drop, hint: 'Sugar, HbA1c', tags: 'diabetes sugar' },
	{ match: /cardi/, icon: I.heart, hint: 'Heart, BP', tags: 'heart chest pain bp cholesterol' },
	{ match: /derma|skin/, icon: I.skin, hint: 'Skin, hair', tags: 'skin rash acne hair' },
	{ match: /paediat|pediat|child|neonat/, icon: I.child, hint: 'Children', tags: 'child baby kids vaccination' },
	{
		match: /gynae|gyne|gynec|obstet|women/,
		icon: I.woman,
		hint: 'Women’s health',
		tags: 'period pregnancy pcos women',
	},
	{ match: /ortho|bone/, icon: I.bone, hint: 'Bones, joints', tags: 'joint pain back pain knee fracture' },
	{ match: /neuro/, icon: I.brain, hint: 'Brain, nerves', tags: 'headache migraine numbness seizure' },
	{ match: /psychi|psycho|mental/, icon: I.mind, hint: 'Mood, sleep', tags: 'anxiety depression sleep stress' },
	{ match: /gastro|hepat/, icon: I.stomach, hint: 'Stomach, liver', tags: 'stomach pain acidity liver digestion' },
	{ match: /pulmo|respir|chest/, icon: I.lungs, hint: 'Lungs, breathing', tags: 'cough asthma breathing lungs' },
	{ match: /ophthal|\beye\b|optom/, icon: I.eye, hint: 'Eyes', tags: 'eye vision' },
	{ match: /nephro|kidney/, icon: I.kidney, hint: 'Kidneys', tags: 'kidney urine' },
]

export type SpecialityVisual = { icon: string; hint: string; tags: string }

export function specialityVisual(label: string): SpecialityVisual {
	const key = label.toLowerCase().trim()
	const found = META.find((m) => m.match.test(key))
	return found ? { icon: found.icon, hint: found.hint, tags: found.tags } : { icon: I.steth, hint: '', tags: '' }
}
