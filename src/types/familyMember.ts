// src/types/familyMember.ts

export interface FamilyMember {
  id: string           // public_id from backend
  name: string
  relation: string | null
  avatar_s3_key: string | null
  is_self: boolean
}

export interface CreateFamilyMemberPayload {
  name: string
  relation: string
  gender?: string
  date_of_birth?: string   // YYYY-MM-DD
  blood_group?: string
  avatar?: string
}

export interface UpdateFamilyMemberPayload {
  name?: string
  gender?: string
  date_of_birth?: string   // YYYY-MM-DD
  blood_group?: string
  marital_status?: string
  height?: number
  weight?: number
  emergency_contact_name?: string
  emergency_contact_number?: string
  location?: string
  avatar?: string
  allergies?: string[]
  chronic_conditions?: string[]
  current_medications?: string[]
  family_history?: string
  smoking_status?: string
  alcohol_consumption?: string
  activity_level?: string
  food_preference?: string
  sleep_hours?: number
  occupation?: string
}
