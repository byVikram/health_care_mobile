export type AppointmentModeKey = "clinic" | "video";

export interface HospitalItem {
  id: string;
  label: string;
  address?: string;
}

export interface BackgroundListItem {
  id: string;
  label: string;
  sublabel?: string;
}

export interface AchievementItem {
  id: string;
  category: string;
  title: string;
  imageUrl: string;
  awardedOn: string;
  issuingOrganization: string;
  description: string;
}

export interface HospitalEntry {
  hospital: {
    id: string;
    name: string;
    address?: string;
    distance?: string;
  };
  is_primary?: boolean;
  offline_consultation_fee?: string | number;
  video_consultation_fee?: string | number;
}
