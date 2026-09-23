// NOTE: This is local mock/demo data used to build the Laboratory Discovery
// UI before a real backend catalog exists.
// TODO(backend): replace `POPULAR_DIAGNOSTIC_TESTS` / `HEALTH_CHECKUP_PACKAGES`
// with paginated `GET /laboratory/tests` and `GET /laboratory/packages`
// calls once those endpoints exist — keep the `DiagnosticTestItem` /
// `HealthPackageItem` shapes so the screens and cards that consume them
// don't need to change.

export interface DiagnosticTestItem {
	id: string
	name: string
	alsoKnownAs: string
	price: number
	originalPrice?: number
	parameters: number
	reportTime: string
	fastingRequired: string
	category: string
	description: string
}

export interface HealthPackageItem {
	id: string
	name: string
	testCount: number
	ageRange: string
	price: number
	originalPrice: number
	discountPercent: number
	category: 'featured' | 'women' | 'men'
	gender: 'all' | 'female' | 'male'
	fastingRequired: string
	reportTime: string
	includesSummary: string
	image?: any
	popularTag?: string | null
}

export interface PackageCategoryTabItem {
	id: string
	label: string
	icon?: string
}

export const PACKAGE_CATEGORIES: PackageCategoryTabItem[] = [
	{ id: 'featured', label: 'Featured', icon: 'star-outline' },
	{ id: 'women', label: "Women's Health", icon: 'gender-female' },
	{ id: 'men', label: "Men's Health", icon: 'gender-male' },
]

export const POPULAR_DIAGNOSTIC_TESTS: DiagnosticTestItem[] = [
	{
		id: 'test-1',
		name: 'Thyroid Profile',
		alsoKnownAs: 'Known as Thyroid Profile Total Blood',
		price: 420,
		originalPrice: 650,
		parameters: 3,
		reportTime: '12-24 hrs',
		fastingRequired: 'Fasting 10-12 hrs',
		category: 'popular',
		description: 'Evaluates thyroid gland function; includes Total T3, Total T4, and TSH levels.',
	},
	{
		id: 'test-2',
		name: 'Complete Blood Count',
		alsoKnownAs: 'Known as Complete Blood Count',
		price: 300,
		originalPrice: 450,
		parameters: 24,
		reportTime: '6-8 hrs',
		fastingRequired: 'No fasting required',
		category: 'popular',
		description: 'Measures red & white blood cells, platelets, hemoglobin, and hematocrit.',
	},
	{
		id: 'test-3',
		name: 'Lipid Profile',
		alsoKnownAs: 'Known as Lipid Profile Blood',
		price: 620,
		originalPrice: 900,
		parameters: 7,
		reportTime: '12 hrs',
		fastingRequired: 'Fasting 12-14 hrs',
		category: 'popular',
		description: 'Assesses cardiovascular health; includes HDL, LDL, VLDL, and triglycerides.',
	},
	{
		id: 'test-4',
		name: 'Liver Function Test',
		alsoKnownAs: 'Known as Liver Function Tests Blood',
		price: 790,
		originalPrice: 1100,
		parameters: 11,
		reportTime: '12 hrs',
		fastingRequired: 'Fasting 8-10 hrs',
		category: 'popular',
		description: 'Checks liver health, enzymes (SGOT, SGPT), bilirubin, and protein levels.',
	},
	{
		id: 'test-5',
		name: 'Diabetes Screening (HbA1c)',
		alsoKnownAs: 'Known as Glycated Hemoglobin Test',
		price: 450,
		originalPrice: 600,
		parameters: 2,
		reportTime: '6 hrs',
		fastingRequired: 'No fasting required',
		category: 'popular',
		description: 'Provides average blood glucose levels over the preceding 2 to 3 months.',
	},
	{
		id: 'test-6',
		name: 'Vitamin D & B12 Combo',
		alsoKnownAs: 'Known as 25-Hydroxy Vitamin D & Cyanocobalamin',
		price: 1199,
		originalPrice: 1800,
		parameters: 2,
		reportTime: '24 hrs',
		fastingRequired: 'No fasting required',
		category: 'popular',
		description: 'Evaluates essential bone density support, nerve function, and energy vitality.',
	},
	// --- Additional tests (beyond the first 6) so the Home screen's "See All
	// Tests" entry point has a larger catalog to open into. Same shape/style
	// as the six above; replace via the backend TODO at the top of this file.
	{
		id: 'test-7',
		name: 'Vitamin D Test',
		alsoKnownAs: 'Known as 25-Hydroxy Vitamin D',
		price: 799,
		originalPrice: 1100,
		parameters: 1,
		reportTime: '24 hrs',
		fastingRequired: 'No fasting required',
		category: 'popular',
		description: 'Measures Vitamin D levels to assess bone health and immunity.',
	},
	{
		id: 'test-8',
		name: 'Iron Studies',
		alsoKnownAs: 'Known as Iron Profile with TIBC',
		price: 899,
		originalPrice: 1300,
		parameters: 5,
		reportTime: '24 hrs',
		fastingRequired: 'Fasting 8 hrs',
		category: 'popular',
		description: 'Evaluates iron levels, TIBC, and transferrin saturation to check for anemia.',
	},
	{
		id: 'test-9',
		name: 'Kidney Function Test',
		alsoKnownAs: 'Known as KFT / Renal Function Test',
		price: 599,
		originalPrice: 850,
		parameters: 9,
		reportTime: '12 hrs',
		fastingRequired: 'No fasting required',
		category: 'popular',
		description: 'Assesses kidney health via creatinine, urea, uric acid, and electrolytes.',
	},
	{
		id: 'test-10',
		name: 'Urine Routine & Microscopy',
		alsoKnownAs: 'Known as Urine R/M',
		price: 199,
		originalPrice: 300,
		parameters: 15,
		reportTime: '6 hrs',
		fastingRequired: 'No fasting required',
		category: 'popular',
		description: 'Screens for urinary tract infections, kidney disorders, and diabetes markers.',
	},
	{
		id: 'test-11',
		name: 'C-Reactive Protein (CRP)',
		alsoKnownAs: 'Known as CRP Quantitative',
		price: 499,
		originalPrice: 700,
		parameters: 1,
		reportTime: '6 hrs',
		fastingRequired: 'No fasting required',
		category: 'popular',
		description: 'Detects inflammation in the body, useful in infections and chronic conditions.',
	},
	{
		id: 'test-12',
		name: 'Electrolyte Panel',
		alsoKnownAs: 'Known as Sodium, Potassium, Chloride',
		price: 449,
		originalPrice: 650,
		parameters: 3,
		reportTime: '8 hrs',
		fastingRequired: 'No fasting required',
		category: 'popular',
		description: 'Measures sodium, potassium, and chloride to check fluid and muscle balance.',
	},
	{
		id: 'test-13',
		name: 'Blood Sugar (Fasting & PP)',
		alsoKnownAs: 'Known as FBS & PPBS',
		price: 199,
		originalPrice: 300,
		parameters: 2,
		reportTime: '6 hrs',
		fastingRequired: 'Fasting 8-10 hrs',
		category: 'popular',
		description: 'Checks fasting and post-meal glucose levels to screen for diabetes.',
	},
	{
		id: 'test-14',
		name: 'Calcium & Phosphorus Panel',
		alsoKnownAs: 'Known as Bone Mineral Panel',
		price: 349,
		originalPrice: 500,
		parameters: 2,
		reportTime: '12 hrs',
		fastingRequired: 'No fasting required',
		category: 'popular',
		description: 'Assesses bone and parathyroid health through calcium and phosphorus levels.',
	},
]

export const HEALTH_CHECKUP_PACKAGES: HealthPackageItem[] = [
	{
		id: 'pkg-1',
		name: 'Vitamin Deficiency Health Checkup',
		testCount: 5,
		ageRange: '11–80 yrs',
		price: 899,
		originalPrice: 1200,
		discountPercent: 25,
		category: 'featured',
		gender: 'all',
		fastingRequired: 'No fasting required',
		reportTime: '24 hrs',
		includesSummary: 'Vit D, Vit B12, Calcium, Iron, Phosphorus',
		image: require('../../../assets/Laboratory/lab1.jpg'),
		popularTag: 'Bestseller',
	},
	{
		id: 'pkg-2',
		name: 'Young Indian Health Checkup – Advanced',
		testCount: 96,
		ageRange: '30–50 yrs',
		price: 2599,
		originalPrice: 3400,
		discountPercent: 24,
		category: 'featured',
		gender: 'all',
		fastingRequired: 'Fasting 10-12 hrs',
		reportTime: '24 hrs',
		includesSummary: 'CBC, Lipid, LFT, KFT, Thyroid, Blood Sugar, Urine Routine, Vitamins',
		image: require('../../../assets/Laboratory/lab2.jpg'),
		popularTag: 'Most Popular',
	},
	{
		id: 'pkg-3',
		name: 'Well Woman Comprehensive Checkup',
		testCount: 78,
		ageRange: '18–65 yrs',
		price: 1999,
		originalPrice: 2800,
		discountPercent: 29,
		category: 'women',
		gender: 'female',
		fastingRequired: 'Fasting 10-12 hrs',
		reportTime: '24 hrs',
		includesSummary: 'Thyroid, Iron profile, CBC, Calcium, Vitamin D, Hormonal screen',
		image: require('../../../assets/Laboratory/lab3.jpg'),
		popularTag: 'Women Special',
	},
	{
		id: 'pkg-4',
		name: "Women's Hormonal & Bone Health Profile",
		testCount: 42,
		ageRange: '25–60 yrs',
		price: 1699,
		originalPrice: 2400,
		discountPercent: 29,
		category: 'women',
		gender: 'female',
		fastingRequired: 'Fasting 8-10 hrs',
		reportTime: '24 hrs',
		includesSummary: 'LH, FSH, Prolactin, TSH, Calcium, Phosphorus, Alkaline Phosphatase',
		image: require('../../../assets/Laboratory/lab1.jpg'),
		popularTag: null,
	},
	{
		id: 'pkg-5',
		name: "Men's Vitality & Cardiac Health Checkup",
		testCount: 84,
		ageRange: '25–65 yrs',
		price: 2299,
		originalPrice: 3100,
		discountPercent: 26,
		category: 'men',
		gender: 'male',
		fastingRequired: 'Fasting 10-12 hrs',
		reportTime: '24 hrs',
		includesSummary: 'Cardiac Risk Markers, Lipid Profile, Liver & Kidney Function, Testosterone',
		image: require('../../../assets/Laboratory/lab2.jpg'),
		popularTag: 'High Value',
	},
	{
		id: 'pkg-6',
		name: 'Senior Citizen Complete Health Care',
		testCount: 88,
		ageRange: '55+ yrs',
		price: 2799,
		originalPrice: 3990,
		discountPercent: 30,
		category: 'men',
		gender: 'all',
		fastingRequired: 'Fasting 10-12 hrs',
		reportTime: '24 hrs',
		includesSummary: 'Comprehensive Geriatric Profile, Electrolytes, Bone markers, Sugar, Cardiac',
		image: require('../../../assets/Laboratory/lab3.jpg'),
		popularTag: 'Senior Care',
	},
]
