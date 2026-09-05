import ApiService from './apiService'
import { API_ENDPOINTS } from '../constants/apiUrls'

export interface BlogAuthor {
	id: string
	name: string
	bio?: string
	avatar_url?: string
}

export interface BlogPost {
	id: string
	title: string
	slug: string
	content: string
	category: string
	status: string
	image_url?: string
	is_featured: boolean
	published_at?: string
	created_at: string
	author: BlogAuthor
}

export interface BlogComment {
	id: string
	content: string
	status: string
	created_at: string
	user_id: string
	user_name: string
	user_role: string
	replies: BlogComment[]
}

export interface PaginatedBlogsResponse {
	success: boolean
	message: string
	data: BlogPost[]
	meta: {
		total: number
		page: number
		limit: number
		pages: number
	}
}

export const listBlogs = async (
	category?: string,
	page = 1,
	limit = 10,
	isFeatured?: boolean
): Promise<PaginatedBlogsResponse> => {
	const params: Record<string, unknown> = { page, limit }
	if (category) {
		params.category = category
	}
	if (isFeatured !== undefined) {
		params.is_featured = isFeatured
	}
	const res = await ApiService.getWithParams<PaginatedBlogsResponse>(API_ENDPOINTS.BLOGS.LIST, params)
	return res.data
}

export const getBlogPost = async (slug: string): Promise<{ success: boolean; data: BlogPost }> => {
	const res = await ApiService.get<{ success: boolean; data: BlogPost }>(API_ENDPOINTS.BLOGS.DETAIL(slug))
	return res.data
}

export const getBlogComments = async (slug: string): Promise<{ success: boolean; data: BlogComment[] }> => {
	const res = await ApiService.get<{ success: boolean; data: BlogComment[] }>(API_ENDPOINTS.BLOGS.COMMENTS(slug))
	return res.data
}

export const createBlogComment = async (
	slug: string,
	content: string,
	parentId?: string
): Promise<{ success: boolean; data: BlogComment }> => {
	const body: { content: string; parent_id?: string } = { content }
	if (parentId) {
		body.parent_id = parentId
	}
	const res = await ApiService.post<{ success: boolean; data: BlogComment }>(
		API_ENDPOINTS.BLOGS.COMMENTS(slug),
		body
	)
	return res.data
}
