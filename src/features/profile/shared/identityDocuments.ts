// What the API returns for a provider's government IDs. Shared by the doctor and the ancillary provider profile
// (the same flow for both): the IDs uploaded so far, and the ID types the provider can choose from.

export interface IdentityDocumentType {
	/** e.g. `aadhaar`, `pan_card`, `driving_license`, `passport` */
	code: string
	label: string
}

export interface IdentityDocument {
	/** The ID type's code, e.g. `aadhaar`. */
	type: string
	label: string
	/** A short-lived signed link to the file. */
	url: string | null
	/** Review state: pending / approved / rejected / reupload */
	status?: string | null
}
