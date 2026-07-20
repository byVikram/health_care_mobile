// src/features/profile/patient/family/familyMemberService.ts

import ApiService from '../../../../services/apiService'
import { API_ENDPOINTS } from '../../../../constants/apiUrls'
import type {
  FamilyMember,
  CreateFamilyMemberPayload,
  UpdateFamilyMemberPayload,
} from '../../../../types/familyMember'

interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

/**
 * GET /api/patients/family-members
 * Returns self + all family members (excluding soft-deleted).
 */
export const getFamilyMembers = async (): Promise<FamilyMember[]> => {
  const res = await ApiService.get<ApiResponse<FamilyMember[]>>(
    API_ENDPOINTS.FAMILY_MEMBERS.LIST
  )
  return res.data?.data ?? []
}

/**
 * POST /api/patients/family-members
 * Creates a new dependent patient under the current account.
 */
export const createFamilyMember = async (
  data: CreateFamilyMemberPayload
): Promise<FamilyMember> => {
  const res = await ApiService.post<ApiResponse<FamilyMember>>(
    API_ENDPOINTS.FAMILY_MEMBERS.CREATE,
    data
  )
  return res.data.data
}

/**
 * DELETE /api/patients/family-members/{patientPublicId}
 * Soft-deletes a family member.
 */
export const deleteFamilyMember = async (patientPublicId: string): Promise<void> => {
  await ApiService.delete(API_ENDPOINTS.FAMILY_MEMBERS.DELETE(patientPublicId))
}

/**
 * GET /api/patients/me/details?patient_id={patientPublicId}
 * Fetches the full details of a family member (reuses the existing patient details endpoint).
 */
export const getFamilyMemberDetails = async (patientPublicId: string): Promise<any> => {
  const res = await ApiService.get<ApiResponse<any>>(
    API_ENDPOINTS.FAMILY_MEMBERS.GET_DETAILS(patientPublicId)
  )
  return res.data?.data ?? null
}

/**
 * PATCH /api/patients/me/details?patient_id={patientPublicId}
 * Updates the details of a family member.
 */
export const updateFamilyMemberDetails = async (
  patientPublicId: string,
  data: UpdateFamilyMemberPayload
): Promise<any> => {
  const res = await ApiService.patch<ApiResponse<any>>(
    API_ENDPOINTS.FAMILY_MEMBERS.UPDATE_DETAILS(patientPublicId),
    data
  )
  return res.data?.data ?? null
}
