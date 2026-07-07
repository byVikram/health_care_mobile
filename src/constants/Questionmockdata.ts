export interface Reply {
	id: number
	name: string
	avatar: string
	timeAgo: string
	reply: string
	likes: number
}

export interface DoctorAnswer {
	id: number
	doctorName: string
	specialty: string
	hospital: string
	avatar: string
	timeAgo: string
	answer: string
	likes: number
	patientReplies?: Reply[]
}

export interface PatientQuestion {
	id: number
	gender: string
	age: string
	location: string
	timeAgo: string
	tag: string
	question: string
	patientAvatar: string
	shortDescription: string
	fullDescription: string
	patientLabel: string
	patientLocation: string
	history: string
	answers: DoctorAnswer[]
}
export const MOCK_PATIENT_QUESTIONS: PatientQuestion[] = [
	{
		id: 1,
		gender: 'Female',
		age: '30 Years',
		location: 'Bengaluru',
		timeAgo: '1D AGO',
		tag: 'Oncology Inquiry',
		question: 'Chance of esophageal cancer?',
		patientAvatar: 'https://i.pravatar.cc/150?img=47',
		shortDescription: 'Persistent acid reflux and swallowing difficulty...',
		fullDescription:
			"I've had GERD and difficulty swallowing for 3 weeks. Family history of cancer makes me worried.",
		patientLabel: '30 Year Old Female',
		patientLocation: 'Bengaluru, India',
		history: 'Family Hx, GERD',
		answers: [
			{
				id: 1,
				doctorName: 'Dr. Sarah Chen',
				specialty: 'Gastroenterologist',
				hospital: 'Apollo Hospitals',
				avatar: 'https://i.pravatar.cc/150?img=12',
				timeAgo: '4h ago',
				answer: 'At your age cancer is unlikely. But endoscopy is recommended for safety.',
				likes: 18,
				patientReplies: [
					{
						id: 1,
						name: 'Patient',
						avatar: 'https://i.pravatar.cc/150?img=47',
						timeAgo: '3h ago',
						reply: 'Thank you doctor, this really helped 🙏',
						likes: 6,
					},
					{
						id: 2,
						name: 'Dr. Sarah Chen',
						avatar: 'https://i.pravatar.cc/150?img=12',
						timeAgo: '2h ago',
						reply: 'You’re welcome. Please follow up after tests.',
						likes: 10,
					},
				],
			},
			{
				id: 2,
				doctorName: 'Dr. James Wilson',
				specialty: 'Oncologist',
				hospital: 'Memorial Care',
				avatar: 'https://i.pravatar.cc/150?img=52',
				timeAgo: '8h ago',
				answer: 'Most likely GERD-related irritation. Monitor symptoms closely.',
				likes: 14,
			},
		],
	},

	{
		id: 2,
		gender: 'Male',
		age: '45 Years',
		location: 'Mumbai',
		timeAgo: '2D AGO',
		tag: 'Respiratory',
		question: 'Persistent cough after viral infection',
		patientAvatar: 'https://i.pravatar.cc/150?img=11',
		shortDescription: 'Dry cough after cold...',
		fullDescription: 'Cough lasting 4 weeks after viral infection.',
		patientLabel: '45 Year Old Male',
		patientLocation: 'Mumbai, India',
		history: 'None reported',
		answers: [
			{
				id: 1,
				doctorName: 'Dr. Priya Nair',
				specialty: 'Pulmonologist',
				hospital: 'Fortis Hospital',
				avatar: 'https://i.pravatar.cc/150?img=44',
				timeAgo: '1d ago',
				answer: 'Post-viral cough can last 6–8 weeks. Usually not serious.',
				likes: 21,
				patientReplies: [
					{
						id: 1,
						name: 'Patient',
						avatar: 'https://i.pravatar.cc/150?img=11',
						timeAgo: '20h ago',
						reply: 'It’s mostly at night, is that normal?',
						likes: 4,
					},
					{
						id: 2,
						name: 'Dr. Priya Nair',
						avatar: 'https://i.pravatar.cc/150?img=44',
						timeAgo: '18h ago',
						reply: 'Yes, night cough is common after viral infection.',
						likes: 8,
					},
				],
			},
		],
	},

	{
		id: 3,
		gender: 'Female',
		age: '52 Years',
		location: 'Bengaluru',
		timeAgo: '3D AGO',
		tag: 'Endocrinology',
		question: 'Managing diabetes during travel',
		patientAvatar: 'https://i.pravatar.cc/150?img=49',
		shortDescription: 'Insulin adjustment during flight...',
		fullDescription: 'Long flight with time zone change and insulin use.',
		patientLabel: '52 Year Old Female',
		patientLocation: 'Bengaluru, India',
		history: 'Type 2 Diabetes',
		answers: [
			{
				id: 1,
				doctorName: 'Dr. Anil Kumar',
				specialty: 'Endocrinologist',
				hospital: 'Manipal Hospitals',
				avatar: 'https://i.pravatar.cc/150?img=60',
				timeAgo: '2d ago',
				answer: 'Adjust insulin slightly and monitor glucose frequently.',
				likes: 28,
				patientReplies: [
					{
						id: 1,
						name: 'Patient',
						avatar: 'https://i.pravatar.cc/150?img=49',
						timeAgo: '1d ago',
						reply: 'Should I skip insulin during flight?',
						likes: 5,
					},
					{
						id: 2,
						name: 'Dr. Anil Kumar',
						avatar: 'https://i.pravatar.cc/150?img=60',
						timeAgo: '22h ago',
						reply: 'No, never skip insulin. Just adjust timing.',
						likes: 11,
					},
				],
			},
		],
	},

	{
		id: 4,
		gender: 'Female',
		age: '5 Years',
		location: 'Delhi',
		timeAgo: '5D AGO',
		tag: 'Dermatology',
		question: 'Child skin rash after detergent',
		patientAvatar: 'https://i.pravatar.cc/150?img=48',
		shortDescription: 'Itchy rash on arm...',
		fullDescription: 'Red itchy rash after detergent change.',
		patientLabel: '5 Year Old Female',
		patientLocation: 'Delhi, India',
		history: 'No allergies',
		answers: [
			{
				id: 1,
				doctorName: 'Dr. Meena Sharma',
				specialty: 'Dermatologist',
				hospital: 'AIIMS Delhi',
				avatar: 'https://i.pravatar.cc/150?img=35',
				timeAgo: '4d ago',
				answer: 'Likely contact dermatitis. Avoid irritant immediately.',
				likes: 25,
				patientReplies: [
					{
						id: 1,
						name: 'Parent',
						avatar: 'https://i.pravatar.cc/150?img=48',
						timeAgo: '3d ago',
						reply: 'It’s still itching a lot 😟',
						likes: 4,
					},
					{
						id: 2,
						name: 'Dr. Meena Sharma',
						avatar: 'https://i.pravatar.cc/150?img=35',
						timeAgo: '3d ago',
						reply: 'Use mild moisturizer and avoid detergents.',
						likes: 9,
					},
				],
			},
		],
	},

	{
		id: 5,
		gender: 'Male',
		age: '38 Years',
		location: 'Chennai',
		timeAgo: '6D AGO',
		tag: 'Cardiology',
		question: 'Chest pain after exercise',
		patientAvatar: 'https://i.pravatar.cc/150?img=15',
		shortDescription: 'Chest tightness on exertion...',
		fullDescription: 'Pain while climbing stairs relieved by rest.',
		patientLabel: '38 Year Old Male',
		patientLocation: 'Chennai, India',
		history: 'Family history',
		answers: [
			{
				id: 1,
				doctorName: 'Dr. Ramesh Iyer',
				specialty: 'Cardiologist',
				hospital: 'Fortis Malar',
				avatar: 'https://i.pravatar.cc/150?img=33',
				timeAgo: '5d ago',
				answer: 'Classic angina symptoms. Needs urgent evaluation.',
				likes: 45,
				patientReplies: [
					{
						id: 1,
						name: 'Patient',
						avatar: 'https://i.pravatar.cc/150?img=15',
						timeAgo: '4d ago',
						reply: 'Is this serious doctor?',
						likes: 7,
					},
					{
						id: 2,
						name: 'Dr. Ramesh Iyer',
						avatar: 'https://i.pravatar.cc/150?img=33',
						timeAgo: '4d ago',
						reply: 'Not immediate danger but needs tests ASAP.',
						likes: 18,
					},
				],
			},
		],
	},
]
