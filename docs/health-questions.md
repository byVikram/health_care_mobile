# Health questions: My questions (patient) and My answers (doctor)

The public Health questions feed (`features/health-feed/HealthQuestionsPage.tsx`, `GET /api/qa`) has two personal views, from the "Patient Questions" design: the patient's **My questions** and the doctor's **My answers**. Both use the shared `QuestionCard` (`health-feed/QuestionCard.tsx`) in a variant, so the card is one component:

| Variant | Where | Shows |
|---|---|---|
| `feed` | Health questions list | topic pill, who asked and when, title, 2-line preview, "N doctors answered" / "Waiting for an answer" |
| `mine` | patient My questions | the same, an "N new" chip, a rule over the status line ("Waiting for an answer · usually within 24 hrs"), a chevron |
| `answered` | doctor My answers | "You: first line of my answer", an "N new answers" chip, footer: helpful votes, "+N doctors answered" / "Only you answered", when |

The doctor's answer on the patient side is one component too, `AnswerCard` (`health-feed/AnswerCard.tsx`): the public question thread and the patient's Your question both use it (props: `top` for the Most helpful ribbon, `isNew`, `avatar`, `whenPrefix`, `spread`).

Both lists are entered through the same card, `QaEntryCard` (`health-feed/QaEntryCard.tsx`): an icon tile, a title over a one-line subtitle, an amber "N new answers" chip and a chevron. The patient's is "My questions" (`MyQuestionsLink`, the first thing under the Health questions header: "3 asked · see doctors' answers"), the doctor's is "My answers" (`MyAnswersLink`, in the Patient questions section of Engage: "24 answered · see other doctors' answers"); each reads its total from the list API and counts the new answers with `seenQuestions`.

**Patient** (`MyQuestionsPage`, `MyQuestionDetailPage`; routes `PATIENT_MY_QUESTIONS`, `PATIENT_MY_QUESTION_DETAIL`): reached from the "My questions" card under the Health questions header. The list is `GET /api/qa?scope=mine` (the questions still waiting for review included), the ones without an answer first, then the answered ones, with a pinned "Ask a new question" (the existing `AskQuestionSheet`). "Your question" shows the question, a "Waiting for a doctor" card or one card per answer (verified tick, role, a "New" chip, Helpful vote, Consult to the doctor's profile) and the general-advice note.

**Doctor** (`features/doctor/dashboard/MyAnswersPage`, `MyAnswerDetailPage`; routes `DOCTOR_MY_ANSWERS`, `DOCTOR_MY_ANSWER_DETAIL`): reached from the "My answers" card in the Patient questions section of Engage. The list is `GET /api/qa?scope=answered_by_me`, the doctor's newest answer first. "Question & answers" shows the question, "YOUR ANSWER" (the answer flagged `is_mine`, when, helpful votes), then the other doctors' answers or "Only you have answered so far". The design's **Edit answer** is not built: the backend has no edit endpoint.

**"New"** (the chips and the "New" tag on an answer): the backend keeps no per-user "seen", so `seenQuestions.ts` stores on the device (AsyncStorage) when each question was last opened; an answer is new when it is later than that (for a question never opened: later than the moment the feature first ran on the device, so answers from before are not all "new"; for a doctor only other doctors' answers count). It survives restarts and does not follow the user to another phone.

Backend contract and tests: the backend's `docs/blogs-articles-and-content-lists.md` (`scope`, `is_mine`) and `tests/test_qa_my_questions_answers.py`. Not run on a device: `npx tsc --noEmit` and ESLint only.
