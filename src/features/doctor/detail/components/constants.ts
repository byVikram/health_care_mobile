import type { AchievementItem, BackgroundListItem } from "./types";

export const DETAIL_PRIMARY = "#2B6F71";

export const MOCK_SPECIALIZATIONS: BackgroundListItem[] = [
  { id: "spec-1", label: "Coronary Angioplasty" },
  { id: "spec-2", label: "Heart Failure" },
  { id: "spec-3", label: "Pacemaker Implantation" },
  { id: "spec-4", label: "Echocardiography" },
  { id: "spec-5", label: "Valvular Heart Disease" },
  { id: "spec-6", label: "Lipid Management" },
];

export const MOCK_CERTIFICATIONS: BackgroundListItem[] = [
  { id: "cert-1", label: "Fellow of the American College of Cardiology (FACC)" },
  { id: "cert-2", label: "Cardiological Society of India (CSI) Lifetime Member" },
  { id: "cert-3", label: "Certified Heart Failure Specialist - ESC" },
  { id: "cert-4", label: "Advanced Cardiac Life Support (ACLS) Certified" },
];

export const MOCK_MEMBERSHIPS: BackgroundListItem[] = [
  { id: "mem-1", label: "Member of the Cardiological Society of India (CSI)" },
  { id: "mem-2", label: "Member of the Indian Medical Association (IMA)" },
  { id: "mem-3", label: "Fellow of the American Heart Association (AHA)" },
];

export const MOCK_ACHIEVEMENTS: AchievementItem[] = [
  {
    id: "ach-1",
    category: "Award",
    title: "Excellence in Interventional Cardiology Award 2024",
    imageUrl: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=600&q=80",
    awardedOn: "15 March 2024",
    issuingOrganization: "Indian Cardiology Association (ICA)",
    description:
      "This award is presented to cardiologists who have demonstrated outstanding expertise, leadership, and innovation in interventional cardiology. It recognizes meaningful contributions to improving patient outcomes, advancing minimally invasive cardiac procedures, and setting high standards for clinical excellence.",
  },
  {
    id: "ach-2",
    category: "Recognition",
    title: "Best Cardiologist Recognition by Medical Association",
    imageUrl: "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?w=600&q=80",
    awardedOn: "22 January 2024",
    issuingOrganization: "National Medical Association",
    description:
      "Recognized for consistent excellence in cardiac care, patient communication, and clinical outcomes across complex cardiology cases.",
  },
  {
    id: "ach-3",
    category: "Conference",
    title: "International Cardiology Conference Speaker",
    imageUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80",
    awardedOn: "08 November 2023",
    issuingOrganization: "Global Heart Summit",
    description:
      "Invited as a speaker to present clinical insights on contemporary interventional cardiology practices, emerging technologies, and multidisciplinary cardiac care.",
  },
  {
    id: "ach-4",
    category: "Research",
    title: "Published Research on Advanced Heart Failure Management",
    imageUrl: "https://images.unsplash.com/photo-1579165466741-7f35e4755660?w=600&q=80",
    awardedOn: "17 August 2023",
    issuingOrganization: "Journal of Cardiac Medicine",
    description:
      "Published peer-reviewed research focused on improving treatment pathways for advanced heart failure management, with emphasis on early diagnosis, medication optimization, and long-term patient monitoring.",
  },
  {
    id: "ach-5",
    category: "Fellowship",
    title: "Advanced Cardiac Care Fellowship",
    imageUrl: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=600&q=80",
    awardedOn: "03 May 2022",
    issuingOrganization: "International College of Cardiology",
    description:
      "Completed an advanced fellowship program focused on high-risk cardiac interventions, complex case planning, and evidence-based cardiac care delivery.",
  },
];
