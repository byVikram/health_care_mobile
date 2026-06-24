const S3_BASE_URL =
	process.env.EXPO_PUBLIC_S3_BASE_URL ||
	process.env.REACT_APP_S3_BASE_URL ||
	'https://healthcare-s3-bucket.s3.amazonaws.com'

export const buildS3Url = (key?: string | null): string | null => {
	if (!key) return null

	if (key.startsWith('http://') || key.startsWith('https://')) {
		return key
	}

	return `${S3_BASE_URL.replace(/\/$/, '')}/${key.replace(/^\//, '')}`
}