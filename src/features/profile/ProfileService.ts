import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'


export interface ProfileFieldConfig {
  key: string;
  apiKey: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  unit?: string;
  verified?: boolean;
  required?: boolean;
  addLabel?: string;   // custom modal title e.g. "Add Allergies"
}


