// src/features/care-ai/components/CareAiAvatar.tsx
//
// The dark round sparkle badge that marks everything Care AI says: header, greeting, each turn's label, the
// typing indicator and the welcome hero. `ring` is the width of the soft mint glow around it.

import React from 'react'
import { StyleSheet, View } from 'react-native'
import { AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { CARE_AI_ICONS } from '../careAiIcons'
import { CARE_AI } from '../careAiTheme'

type Props = {
	size: number
	/** Glow width around the badge. */
	ring: number
	/** Sparkle size. Defaults to half the badge. */
	iconSize?: number
}

export function CareAiAvatar({ size, ring, iconSize = Math.round(size / 2) }: Props) {
	const outer = size + ring * 2
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[styles.glow, { width: outer, height: outer, borderRadius: outer / 2 }]}
		>
			<View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
				<AppPathIcon
					d={CARE_AI_ICONS.sparkle}
					size={iconSize}
					strokeWidth={1.9}
					color={APP_COLORS.mintAccent}
				/>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	glow: { alignItems: 'center', justifyContent: 'center', backgroundColor: CARE_AI.avatarGlow, flexShrink: 0 },
	badge: { alignItems: 'center', justifyContent: 'center', backgroundColor: APP_COLORS.ink },
})
