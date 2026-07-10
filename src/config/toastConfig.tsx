// src/config/toastConfig.tsx
//
// Custom react-native-toast-message config. Extends the library's default
// toast types with a "rejectSuccess" variant: same BaseToast look as the
// default success toast, but with a red left border so a rejection reads
// as visually distinct while staying consistent with the rest of the
// design system.

import React from 'react'
import { BaseToast, BaseToastProps } from 'react-native-toast-message'

export const toastConfig = {
  rejectSuccess: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#e53935' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}
      text2Style={{ fontSize: 12, color: '#6b7280' }}
    />
  ),
}
