# PRD Refinement Questions

## Document Status

- Status: Draft
- Related Documents:
  - `docs/prd/PRD-snapinsight.md`
  - `docs/discovery/requirements-scope-questions.md`

## Purpose

This discovery document is used to clarify open questions that still affect the quality and completeness of `docs/prd/PRD-snapinsight.md`.

Please answer directly under each `Answer:` line.

## How To Use

- Reply by editing this file directly
- If a question is not decided yet, write `TBD`
- If you want to change an earlier PRD decision, state the new final decision clearly

## 1. Support Boundary

### 1.1 Should the first version support selected text inside `input` and `textarea` elements?

Options:
- support both
- support only normal webpage text
- support `input` but not `textarea`
- do not support either in v1

Answer: Both

### 1.2 Should the first version support rich text editors?

Examples:
- Notion-like editors
- online document editors
- editable content blocks

Options:
- support if selection works normally
- explicitly not support in v1
- TBD

Answer: support if selection works normally

### 1.3 Should the first version support text inside `iframe` content?

Options:
- support if technically reachable
- explicitly not support in v1
- TBD

Answer: support if technically reachable

### 1.4 Should the first version support PDF pages opened in Chrome?

Options:
- support
- explicitly not support in v1
- TBD

Answer: explicitly not support in v1

### 1.5 Should the first version support Chrome internal pages or extension pages?

Examples:
- `chrome://`
- Chrome Web Store pages
- extension popup or options pages

Options:
- explicitly not support in v1
- support where Chrome allows it
- TBD

Answer: explicitly not support in v1

## 2. Alternative and Failure Flows

### 2.1 What should happen when the local Python service is not running?

Please define the expected user-facing behavior.

Options:
- show a friendly error in the card
- show a setup hint
- hide the card and only show an error after hover
- other

Answer: show a friendly error in the card

### 2.2 What should happen when Ollama is running but no model is available?

Options:
- show a friendly error and ask the user to configure a model
- disable the feature until a model is selected
- fallback to a default configured model name
- other

Answer: show a friendly error and ask the user to configure a model

### 2.3 What should happen when the model list cannot be loaded?

Options:
- keep previous model selection if available
- show an error in settings
- block all explanation requests
- other

Answer: 如果没有默认的模型，才要让用户先选择模型，否则模型选择这步不是必须的，默认用默认设置的模型来请求解释

### 2.4 What should happen if short introduction succeeds but detailed introduction fails?

Options:
- keep short introduction visible and show error only in the detail area
- close the card
- retry automatically
- other

Answer: keep short introduction visible and show error only in the detail area，并且支持重试

### 2.5 What should happen when the user selects a new term while the previous request is still loading?

Options:
- cancel the old request and switch to the new term
- ignore the new selection until the current request finishes
- keep both in separate cards
- other

Answer: cancel the old request and switch to the new term

### 2.6 What should happen when the user closes the card while detail content is still loading?

Options:
- cancel the request
- let the request finish silently
- cache the result for a short time
- other

Answer: cancel the request if possible

## 3. Model Selection Behavior

### 3.1 How should the default model be chosen in the first version?

Options:
- use the first model returned by Ollama
- require user selection on first use
- remember the most recently selected model
- define a preferred fallback rule

Answer: require user selection on first use

### 3.2 Should the selected model be persisted locally?

Options:
- yes
- no
- TBD

Answer: yes

### 3.3 What should happen if the previously selected model is no longer available?

Options:
- auto-switch to another available model
- ask the user to choose again
- show a warning and disable requests until resolved
- other

Answer: ask the user to choose again

## 4. Interaction State Rules

### 4.1 If a card is already open and the user selects a new term, how should the UI behave?

Options:
- reuse the existing card and replace its content
- close the old card and create a new one
- keep the old card until the user closes it
- other

Answer: lose the old card and create a new one

### 4.2 After detailed content is expanded, what should the close button do?

Options:
- close the entire card directly
- first collapse detail, then require another close action
- other

Answer: close the entire card directly

### 4.3 Should there be a loading state inside the card for short and detailed content?

Options:
- yes, both need loading states
- only detailed content needs loading state
- no visible loading state

Answer: yes, both need loading states, 如果可以的话，最好是流式显示文本，因为请求返回的文本应该也是一个字一个蹦出来的

## 5. Acceptance and Product Quality

### 5.1 Do you want to define a target response time for the short introduction?

Examples:
- target within 2 seconds
- target within 3 seconds
- no strict number in PRD

Answer: no strict number in PRD

### 5.2 Do you want to define a timeout threshold for requests?

Examples:
- 5 seconds
- 8 seconds
- 10 seconds
- no strict number in PRD

Answer: no strict number in PRD

### 5.3 Should the PRD define any explicit product success criteria beyond functional acceptance?

Examples:
- explanation request success rate
- model list load success rate
- major page compatibility target
- no, keep success criteria out of v1 PRD

Answer: no, keep success criteria out of v1 PRD

## 6. Change Tracking

### 6.1 For PRD change records, what level of detail do you want?

Options:
- only major requirement changes
- all non-editorial changes
- every edit including wording adjustments

Answer: only major requirement changes

## 7. Additional Decisions

### 7.1 Is there any other PRD-level product decision you already know should be added now?

Answer:

## 8. Follow-up Clarifications

### 8.1 For rich text editors and `iframe` content, should the PRD treat support as a hard requirement or best-effort support?

Your earlier answers say:
- support rich text editors if selection works normally
- support `iframe` content if technically reachable

Please clarify the PRD-level expectation:
- hard requirement in v1
- best-effort support in v1
- mention as partial support only

Answer: 简单的话就做，有点复杂就先留着不做，优先级不高

### 8.2 There is a conflict between first-use model selection and default-model behavior. Which final rule should the PRD use?

Current answers include:
- require user selection on first use
- if there is a default configured model, model selection is not required before requesting explanations

Please choose one final rule:
- always require explicit user model selection on first use
- use a configured default model if available, otherwise require user selection
- another final rule

Answer: always require explicit user model selection on first use

### 8.3 Should streaming text display be a formal v1 PRD requirement or only a preferred implementation direction?

Your answer suggested that both short and detailed content should have loading states, and that streaming text display would be preferable if possible.

Please clarify:
- streaming is a required v1 behavior
- streaming is preferred but optional
- no streaming requirement in PRD

Answer: streaming is a required v1 behavior

### 8.4 Please convert the rich text editor and `iframe` support rule into a formal PRD statement.

Your current answer is:
- do it if simple
- if it becomes complex, leave it for later
- priority is not high

Please choose the final PRD wording direction:
- best-effort support in v1, but not part of core acceptance
- explicitly out of scope in v1
- support only for normal webpages in PRD, and leave rich text / `iframe` to later design decisions
- another final rule

Answer: explicitly out of scope in v1
