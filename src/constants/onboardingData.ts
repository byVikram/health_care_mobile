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
   "550e8400-e29b-41d4-a716-446655440000": {
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

   "123e4567-e89b-12d3-a456-426614174000": {
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
  "f47ac10b-58cc-4372-a567-0e02b2c3d479": {
      screens: [
        {
          Illustration: Onboarding1,
          description:  'Get lab tests directly from doctors and deliver it for patients instantly',
        },
        {
          Illustration: Onboarding2,
          description:
            'Get lab tests directly from patients and deliver it for them instantly',
        },
        ...commonScreens,
      ],
    },
  "9f8c7b6a-1234-4abc-89de-1234567890ab": {
    screens: [
      {
        Illustration: Onboarding1,
        description:  'Get orders directly from doctors and pack it for patients instantly',
      },
      {
        Illustration: Onboarding2,
        description:
          'Get orders directly from patients and pack it for them instantly',
      },  
      ...commonScreens,
    ],
    },
    
    "7d444840-9dc0-11d1-b245-5ffdce74fad2": {
      screens: [
        {
				Illustration: Onboarding1,
				description:
					'Manage radiology scan appointments and schedules efficiently',
			},
			{
				Illustration: Onboarding2,
				description:
					'Upload scan reports and imaging results securely',
			},
        ...commonScreens,
      ],
    },
  }

