---
description: Wire a new backend API endpoint into the mobile app via the ApiService/axios layer
---

# API Integration

Integrates a new backend endpoint into the app following the standardized axios architecture. Ported from `.gemini/skills/api_integration.md` — keep both in sync if you update one.

## Steps

1. **Constants** — define the endpoint string in `src/constants/apiUrls.ts` under the appropriate domain block in `API_ENDPOINTS`. Never hardcode a URL string in a service or component.
2. **Types** — define request/response interfaces in `src/types/` or directly in the service file. Name descriptively (e.g. `<Feature>Response`).
3. **Service** — locate or create `src/features/<feature>/<feature>Service.ts`.
4. **Implementation** — write an async function using the shared `ApiService` wrapper (`src/services/apiService.ts`), not a raw axios call.
5. **Validation** — parameter types must match the defined interfaces; no `any` where a real type is known.

## Template — `src/features/<feature>/<feature>Service.ts`

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

Note: `src/constants/apiUrls.ts`'s `BASE_URL` reads `EXPO_PUBLIC_API_ENDPOINT` from `.env` and throws at import time if it's unset — make sure `.env` is configured before running the app.
