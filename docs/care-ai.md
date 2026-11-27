# Care AI (the health-assistant chat)

`features/care-ai/`, route `ROUTES.STACK.CARE_AI`, opened from the floating button on the tab bar and the drawer's "Care AI". Patients only.

## How a message goes

1. The patient types, taps a quick-reply chip or a "You could ask" suggestion. `useCareAiChat.askBackend` adds the message, shows "typing", makes the chat session on the first message (`POST /api/chatbot/sessions`) and sends the text (`POST /api/chatbot/sessions/{id}/message`).
2. The backend (`app/chatbot/`, a LangGraph flow: classify, answer or doctor search, safety check) returns the **whole reply at once** (nothing is streamed): `answer`, `possible_conditions`, `home_remedies`, `severity`, `doctor_needed`, `recommended_speciality`, `nearby_doctors`, `sources`.
3. `careAiMapper.replyFromPayload` turns that into the `CareAiReply` the screens draw: the text, a red urgent card for `emergency` (a "see a doctor today" note for `urgent`), the two lists, `DoctorResultsCard` (up to 3 real doctors; a tap opens the doctor's page), buttons into the doctor search, and the "Why this answer?" footer.
4. The thumbs up / down on an answer go to `POST /api/chatbot/messages/{id}/feedback`.

The four welcome starters (Ask a health question, Check a symptom, Ask about medicines, Find the right doctor) are **scripted prompts** in `careAiReplies.ts` ("What's bothering you?" with chips). Tapping a chip sends a sentence to the backend ("I have fever", "Find me a doctor for: ...") like typed text.

If the call fails, the chat says so and the patient can try again; a message that matches `RED_FLAG_PATTERN` (chest pain, stroke ...) gets the urgent-care card from the app itself, so an emergency never ends in "try again".

## Recent chats

`useCareAiSessions` loads `GET /api/chatbot/sessions` each time the sheet opens (chats with no message are left out). Opening one calls `GET /api/chatbot/sessions/{id}` and rebuilds the messages with the same mapper; new messages carry on in that session. "New chat" starts a fresh session on the next message.

## Not built yet (their components are in the folder but not shown)

- Reading the patient's own reports (the report banner, the `+` attach sheet, "Explain my report"): `WelcomePanel` / `Composer` show them only when `onExplainReport` / `onAttach` are passed.
- "Asking for" a family member (`AskingForBar`, `WhoForSheet`): the backend chat works from the logged-in account and has no patient parameter.
- Booking a slot inside the chat (`BookCard`) and the doctor handoff summary: the launch scenarios in `careAiScenarios.ts` still use scripted content and nothing opens them.
- "Use my health records" switch, "Save to my health records", quick-reply chips and "You could ask" suggestions from the backend (it sends none; a missing detail is asked in plain text).
- Doctor photos: the backend sends a storage key, not a link, so the doctor rows show initials.

## Good to know

- **Voice input:** the mic in the message box uses the shared speech hook (`hooks/useVoiceSearch`, the same one as every search bar's mic). While it listens the box shows what is being heard; when the patient is done, the text is added to the message box (not sent). It needs a development / production build with `expo-speech-recognition`; in Expo Go it says speech is not available.

- Replies can take several seconds (the backend asks the model more than once per message); the send call has a 60 s timeout.
- The mock content that is left (`careAiData.ts`, `careAiReplies.ts`: sample doctors, concerns, the HbA1c report) belongs to those unbuilt scenarios and the starters.
