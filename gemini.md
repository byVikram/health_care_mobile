# Antigravity Context: Karola Health Mobile App

## Tech Stack & Architecture
- **Framework:** React Native with Expo (Managed Workflow)
- **Language:** TypeScript
- **Navigation:** React Navigation v7 (Native Stack & Bottom Tabs)
- **UI Library:** React Native Paper + standard `StyleSheet.create`
- **State Management:** React Context + AsyncStorage (No global state managers like Redux/Zustand)
- **API Client:** Axios (Custom `ApiService` wrapper with centralized interceptors)

## Directory Structure
- `src/features/`: Feature-sliced modules (e.g., `dashboard`, `doctor`, `profile`). Contains UI components, feature-specific services, and localized logic.
- `src/components/common/`: Globally reusable UI components. 
- `src/services/`: Core shared services like `apiService.ts`.
- `src/constants/`: Centralized constants, notably `apiUrls.ts` for all endpoints.
- `src/types/`: Centralized TypeScript interfaces mapping to API requests and responses.

## Conventions & Constraints
1. **API Integration:** All API calls MUST go through `ApiService`. Endpoints MUST be defined in `src/constants/apiUrls.ts`.
2. **Component Promotion:** When creating new components, place them inside the relevant feature folder. **CRITICAL:** Always ask the user for permission before promoting a component to `src/components/common/`.
3. **Styling:** Use `StyleSheet.create`. Avoid inline styles unless strictly necessary for dynamic layout calculations. Import and use SVGs as React components from `assets/icons/`.
4. **Error Handling:** Global HTTP errors (401/403) are handled by `ApiService` interceptors. For localized UI feedback, use custom modals (e.g., `StatusModal`).
5. **State:** Use local React state or React Context for global state. Persist session/auth data exclusively via `AsyncStorage`.

---

## Antigravity Skills

The following modular skills map to actual developer tasks based on repeated patterns found in this codebase.

### Skill: Create a New Feature API Integration
**Task:** Integrate a new backend API endpoint into the mobile application.
**Execution Steps:**
1. Define the endpoint string in `src/constants/apiUrls.ts`.
2. Define the Request Payload and Response TypeScript interfaces in `src/types/`.
3. Locate or create the feature service file (e.g., `src/features/[feature]/[feature]Service.ts`).
4. Implement the asynchronous function using the `ApiService` wrapper (e.g., `ApiService.post<ResponseType>`) and return `res.data`.

### Skill: Build a New Feature Screen
**Task:** Scaffold and integrate a new screen into the app.
**Execution Steps:**
1. Create a new directory under `src/features/[feature_name]/` if it represents a new domain.
2. Create the main screen component `[Name]Page.tsx`. Use `StyleSheet.create` for styling.
3. Break down UI elements into smaller components *within* the feature folder. **Do not** place them in `src/components/common/` without explicitly asking the user first.
4. Define the route name in `src/navigation/routes.ts`.
5. Register the screen in the appropriate navigator inside `src/navigation/` (e.g., `AppNavigator.tsx`).

### Skill: Handle Success/Error UI Feedback
**Task:** Provide user feedback after an asynchronous action (e.g., form submission, booking).
**Execution Steps:**
1. Manage loading and error states locally using `useState`.
2. Upon action completion or failure, use the `StatusModal` component to display the result (passing `status="success" | "error"`, `title`, and `description`).
3. Handle navigation or retry logic via the `onSubmit` and `onCancel` callbacks of the `StatusModal`.

*(Note: Detailed execution steps and code templates for these skills are located in `.gemini/skills/`)*

---

## AI Token Optimization & Response Rules
To ensure fast responses and low token consumption, the AI MUST follow these rules:
1. **No Explanations:** Do not explain the code you generate unless explicitly asked. Output only the requested code or markdown.
2. **Targeted Edits:** Always use `replace_file_content` or `multi_replace_file_content` to edit specific blocks instead of rewriting entire files.
3. **Implicit Context:** Assume the developer is already familiar with the codebase architecture. Do not restate `gemini.md` rules in your responses.
4. **Naming Conventions:**
   - Files: `camelCase.ts` for logic, `PascalCase.tsx` for React components.
   - Constants: `UPPER_SNAKE_CASE` (e.g., in `src/constants/apiUrls.ts`).
   - Interfaces: `PascalCase` with descriptive suffixes (e.g., `PatientDetailsResponse`).
