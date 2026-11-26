import ApiService from './apiService'
import { API_ENDPOINTS } from '../constants/apiUrls'

export interface DoctorAnswerReply {
	id: string
	content: string
	created_at: string
	user_id: string
	user_name: string
	user_role: string
	parent_id?: string
	replies: DoctorAnswerReply[]
}

export interface DoctorAnswer {
	id: string
	answer: string
	likes: number
	created_at: string
	doctor_id: string
	doctor_name: string
	doctor_specialty: string
	doctor_hospital: string
	doctor_avatar?: string
	/** True when the signed-in caller is the doctor who wrote this answer ("My answers"). */
	is_mine?: boolean
	replies: DoctorAnswerReply[]
}

export interface PatientQuestion {
	id: string
	gender: string
	age: string
	location: string
	tag: string
	question: string
	short_description: string
	full_description: string
	history?: string
	patient_avatar?: string
	created_at: string
	answers: DoctorAnswer[]
}

export interface PaginatedQuestionsResponse {
	success: boolean
	message: string
	data: PatientQuestion[]
	meta: {
		total: number
		page: number
		limit: number
		pages: number
	}
}

export const listHealthQuestions = async (
	search?: string,
	page = 1,
	limit = 10,
	answered?: boolean,
): Promise<PaginatedQuestionsResponse> => {
	const params: Record<string, unknown> = { page, limit }
	if (search) {
		params.search = search
	}
	if (answered !== undefined) {
		params.answered = answered
	}
	const res = await ApiService.getWithParams<PaginatedQuestionsResponse>(API_ENDPOINTS.QA.LIST, params)
	return res.data
}

/** The signed-in patient's own questions, newest first, the ones still waiting for review included ("My questions"). */
export const listMyQuestions = async (page = 1, limit = 50): Promise<PaginatedQuestionsResponse> => {
	// The list shows its own error state and the entry card stays plain on a failure: no global error dialog for either.
	const res = await ApiService.get<PaginatedQuestionsResponse>(API_ENDPOINTS.QA.LIST, {
		params: { scope: 'mine', page, limit },
		skipGlobalError: true,
	})
	return res.data
}

/** The questions the signed-in doctor has answered, the newest answer of theirs first; their own answer has `is_mine` ("My answers"). */
export const listMyAnswers = async (page = 1, limit = 50): Promise<PaginatedQuestionsResponse> => {
	const res = await ApiService.get<PaginatedQuestionsResponse>(API_ENDPOINTS.QA.LIST, {
		params: { scope: 'answered_by_me', page, limit },
		skipGlobalError: true,
	})
	return res.data
}

export const getQuestionDetail = async (id: string): Promise<{ success: boolean; message: string; data: PatientQuestion }> => {
	const res = await ApiService.get<{ success: boolean; message: string; data: PatientQuestion }>(API_ENDPOINTS.QA.DETAIL(id))
	return res.data
}

export const submitHealthQuestion = async (payload: {
	gender: string
	age: string
	location: string
	tag: string
	question: string
	short_description: string
	full_description: string
	history?: string
}): Promise<{ success: boolean; data: PatientQuestion }> => {
	const res = await ApiService.post<{ success: boolean; data: PatientQuestion }>(API_ENDPOINTS.QA.SUBMIT_QUESTION, payload)
	return res.data
}

export const submitDoctorAnswer = async (questionId: string, answer: string): Promise<{ success: boolean; data: DoctorAnswer }> => {
	const res = await ApiService.post<{ success: boolean; data: DoctorAnswer }>(API_ENDPOINTS.QA.SUBMIT_ANSWER(questionId), { answer })
	return res.data
}

export const submitAnswerReply = async (answerId: string, content: string, parentId?: string): Promise<{ success: boolean; data: DoctorAnswerReply }> => {
	const res = await ApiService.post<{ success: boolean; data: DoctorAnswerReply }>(API_ENDPOINTS.QA.SUBMIT_REPLY(answerId), { content, parent_id: parentId })
	return res.data
}

export const likeDoctorAnswer = async (answerId: string): Promise<{ success: boolean; likes: number }> => {
	const res = await ApiService.post<{ success: boolean; likes: number }>(API_ENDPOINTS.QA.LIKE_ANSWER(answerId), {})
	return res.data
}
