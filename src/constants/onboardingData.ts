// onboardingData.ts

import { USER_ROLES, type UserRole } from './constants'

import Onboarding1 from '../assets/Onboarding/onboarding-1.svg'
import Onboarding2 from '../assets/Onboarding/onboarding-2.svg'
import Onboarding3 from '../assets/Onboarding/onboarding-3.svg'
import Onboarding4 from '../assets/Onboarding/onboarding-4.svg'

type IllustrationType = React.ComponentType<{
  width?: number | string
  height?: number | string
}>

type OnboardingScreen = {
  Illustration: IllustrationType
  description: string
}

type OnboardingConfig = Record<UserRole, { screens: OnboardingScreen[] }>

// 🔁 Reusable common screens
const commonScreens: OnboardingScreen[] = [
  {
    Illustration: Onboarding3,
    description:
      'Get upto 25% off on medicines, from Whisper Ai monthly offer',
  },
  {
    Illustration: Onboarding4,
    description:
      '10 million Indians connect with doctors every year through Whisper Ai',
  },
]

export const onboardingData: OnboardingConfig = {
  [USER_ROLES.PATIENT]: {
    screens: [
      {
        Illustration: Onboarding1,
        description: 'Book an appointment for an in clinic consultation',
      },
      {
        Illustration: Onboarding2,
        description:
          'Book an appointment to consult top doctors from your phone',
      },
      ...commonScreens,
    ],
  },

  [USER_ROLES.DOCTOR]: {
    screens: [
      {
        Illustration: Onboarding1,
        description:
          'Manage appointments and consult patients efficiently',
      },
      {
        Illustration: Onboarding2,
        description:
          'Connect with patients remotely from your phone',
      },
      ...commonScreens,
    ],
  },
}