# Bug report AI drafting

Turns a bug report filed from the Admin app into a searchable issue title, a summary and steps to
reproduce, instead of the reporter's raw words.

Webiny ships a bug reporter in every project: `cmd+shift+b` in the Admin app, describe what broke,
paste a screenshot, and a GitHub issue appears with the environment and a timeline of the last few
minutes attached. On its own it files what the reporter typed, verbatim. This extension decorates
that with a model call.

## Requirements

Webiny 6.6.0 or newer, and AI Power-Ups configured with at least one provider.

## What it does

`capability.ts` registers `bugReporter.draftIssue` as an AI capability, which gives it a row in the
AI Power-Ups settings screen. A project can point it at a different model or append its own
instructions there, the same as any built-in AI feature. It asks for the `standard` model role
rather than `vision`, even though it reads screenshots, because `vision` falls back to `standard`
when unset and a project that has only configured `standard` should still get drafting.

`BugReportDrafterDecorator.ts` decorates `IssueDrafter`. It sends the reporter's words, the first
three screenshots and the recorded timeline to the model, and asks for a title, a summary, steps to
reproduce, expected and actual.

## Why a decorator

The built-in drafter is the fallback, and it is used on two of the three paths through here: no
model role configured, and the model call failing. Only a successful draft discards it.

Losing a report because drafting broke would be the worst possible trade, since the reporter has
already spent the effort. Everything factual in the issue, the screenshots, the environment table
and the timeline, is assembled by the bug reporter regardless of whether a model ran, so a report
that falls back is still complete. It just reads as prose plus evidence rather than as a filled-in
form.

Deleting this extension puts the reporter back exactly as it was.

## Prompt

The instructions live in `capability.ts` and are fixed. A project appends to them through the AI
Power-Ups settings screen rather than replacing them, because the output contract is part of the
implementation: the decorator parses what comes back.

The prompt is told to work only from the evidence and never to invent a cause, a stack trace or a
step that is not in it, and to say so in the summary when the reporter was vague. The timeline is
named as the most reliable part of the input, since a failed GraphQL operation or a console error
in it usually is the bug. Reporters often paste a screenshot and type nothing, because the error
text is in the image, so it is also told to read the screenshots and quote error messages from them
exactly.
