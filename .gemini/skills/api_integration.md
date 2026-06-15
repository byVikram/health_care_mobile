# Skill: Create a New Feature API Integration

## Description
Integrates a new backend API endpoint into the mobile application following the standardized Axios architecture.

## Trigger
Use this skill when asked to connect the frontend to a new backend endpoint.

## Execution Steps
1. **Constants:** Define the endpoint string in `src/constants/apiUrls.ts` under the appropriate domain block.
2. **Types:** Define the Request Payload and Response interfaces in `src/types/` or directly in the service file. Name them descriptively (e.g., `[Feature]Response`).
3. **Service Logic:** Locate or create the feature service file (`src/features/[feature]/[feature]Service.ts`).
4. **Implementation:** Write an asynchronous function using the `ApiService` wrapper.
5. **Validation:** Ensure parameter types match the defined interfaces and no hardcoded URLs exist.

## Code Template (`src/features/[feature]/[feature]Service.ts`)
```typescript
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'

export interface MyFeatureResponse {
  success: boolean
  message: string
  data: any
}

export const myFeatureAction = async (payload: any): Promise<MyFeatureResponse> => {
  const res = await ApiService.post<MyFeatureResponse>(API_ENDPOINTS.DOMAIN.ACTION, payload)
  return res.data
}
```
