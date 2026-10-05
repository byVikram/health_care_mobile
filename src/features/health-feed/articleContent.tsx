// src/features/health-feed/articleContent.tsx
//
// Renders an article/blog body in the Health feeds design's reading style (16/26 paragraphs, 19/26 800
// headings, bulleted/numbered lists, **bold** runs). Post content is stored as light markdown, but some
// older posts are simple HTML, so HTML is first flattened to the same markdown shape.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { APP_COLORS } from '../../config/theme'

const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&nbsp;': ' ',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'",
	'&rsquo;': '’',
	'&lsquo;': '‘',
}

/** Flattens the simple HTML some posts use (h*, p, ul/ol/li, strong/b, br) into markdown text. */
export function htmlToMarkdown(src: string): string {
	if (!/^\s*</.test(src)) return src
	return src
		.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n### $1\n\n')
		.replace(/<li[^>]*>/gi, '\n- ')
		.replace(/<\/(p|div|ul|ol)>/gi, '\n\n')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
		.replace(/<[^>]+>/g, '')
		.replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
}

type Block = { kind: 'h' | 'p' | 'li'; text: string; marker?: string }

function parse(markdown: string): Block[] {
	const blocks: Block[] = []
	let para: string[] = []
	const flush = () => {
		if (para.length) blocks.push({ kind: 'p', text: para.join(' ') })
		para = []
	}
	for (const raw of markdown.split('\n')) {
		const line = raw.trim()
		if (!line) {
			flush()
			continue
		}
		const heading = /^#{1,6}\s+(.*)$/.exec(line)
		const bullet = /^[-*•]\s+(.*)$/.exec(line)
		const numbered = /^(\d+)[.)]\s+(.*)$/.exec(line)
		if (heading) {
			flush()
			blocks.push({ kind: 'h', text: heading[1] })
		} else if (bullet) {
			flush()
			blocks.push({ kind: 'li', text: bullet[1], marker: '•' })
		} else if (numbered) {
			flush()
			blocks.push({ kind: 'li', text: numbered[2], marker: `${numbered[1]}.` })
		} else {
			para.push(line)
		}
	}
	flush()
	return blocks
}

function Inline({ text, style }: { text: string; style: object }) {
	const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
	return (
		<Text style={style}>
			{parts.map((part, i) =>
				part.startsWith('**') && part.endsWith('**') ? (
					<Text key={i} style={styles.bold}>
						{part.slice(2, -2)}
					</Text>
				) : (
					part
				)
			)}
		</Text>
	)
}

export function ArticleBody({ content }: { content: string }) {
	const blocks = parse(htmlToMarkdown(content))
	return (
		<View style={styles.wrap}>
			{blocks.map((b, i) =>
				b.kind === 'h' ? (
					<Text key={i} style={styles.heading} accessibilityRole="header">
						{b.text}
					</Text>
				) : b.kind === 'li' ? (
					<View key={i} style={styles.li}>
						<Text style={[styles.body, styles.marker]}>{b.marker}</Text>
						<Inline text={b.text} style={[styles.body, styles.liText]} />
					</View>
				) : (
					<Inline key={i} text={b.text} style={styles.body} />
				)
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: { gap: 14 },
	body: { fontSize: 16, lineHeight: 26, color: APP_COLORS.ink },
	bold: { fontWeight: '800' },
	heading: { marginTop: 4, fontSize: 19, lineHeight: 26, fontWeight: '800', color: APP_COLORS.ink },
	li: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
	marker: { width: 20 },
	liText: { flex: 1 },
})
