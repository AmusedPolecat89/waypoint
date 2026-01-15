# UX Guidelines

## Purpose of this document

This document defines how Waypoint should **behave**.

Good UX here means:
- respecting the user’s time
- minimizing friction
- never losing or corrupting progress
- making the right action obvious

Waypoint is a memory tool.  
It must be reliable above all else.

---

## UX philosophy

### Progress is sacred
A user’s waypoint is **never disposable**.

Rules:
- Never delete progress without explicit confirmation
- Never overwrite silently
- Never auto-advance without consent

If there is uncertainty, preserve data and ask.

---

### Explicit over implicit
Waypoint does not guess silently.

- Tracking requires opt-in
- Automatic detection must be visible and correctable
- Manual overrides must always exist

The user should never wonder *why* something happened.

---

### Fewer steps beat clever shortcuts
If an action is common, it must be easy.

Core actions should be:
- one click
- clearly labeled
- undoable

Examples:
- Set waypoint
- Update waypoint
- Resume from waypoint
- Mark complete

---

## Core user flows (non-negotiable)

### Adding a waypoint
- Clear entry point
- Minimal required fields
- No forced metadata
- Confirmation that it was saved

The user should never question whether it worked.

---

### Resuming progress
- Obvious “resume” action
- Always resumes from the last saved waypoint
- If resolution fails, show progress anyway

Failure to resolve content must never erase progress.

---

### Editing progress
- Simple, direct editing
- No hidden fields
- Immediate feedback

Users must feel safe correcting mistakes.

---

### Deleting progress
- Requires confirmation
- Clearly states what will be lost
- Never bundled with other actions

Deletion should feel deliberate.

---

## Error handling

Errors should:
- explain what happened
- explain what did *not* happen
- suggest a next step if possible

Avoid:
- technical jargon
- blame
- silent failure

Example:
> “This content couldn’t be found right now.  
Your waypoint is safe.”

---

## Automation boundaries

Automation is helpful only when it:
- saves time
- is predictable
- can be disabled

Automation should never:
- surprise the user
- modify progress invisibly
- lock the user into a behavior

Manual control is always the fallback.

---

## Mental model consistency

Waypoint uses a small set of core concepts:
- Work
- Waypoint
- Source (optional)
- Status

These concepts should:
- be named consistently
- behave consistently
- appear consistently across the UI

Do not introduce new terms casually.

---

## Discoverability vs simplicity

Waypoint should:
- feel usable without instructions
- reveal complexity progressively

Advanced features should not:
- block basic use
- confuse first-time users

Power should be optional, not imposed.

---

## Performance expectations

UX includes perceived speed.

- UI actions should feel instant
- Long operations should show progress
- The extension should never feel heavy

If something takes time, acknowledge it.

---

## Respect attention

Waypoint should:
- never interrupt content
- never display unsolicited notifications
- never nag for engagement

It exists to remember, not to compete.

---

## Long-term UX test

A UX decision is good if:
- it still makes sense after months of use
- it feels obvious in hindsight
- it never makes the user anxious about their data

If it causes doubt, it needs reconsideration.

---

## Summary

A successful Waypoint UX:
- feels trustworthy
- feels predictable
- minimizes effort
- preserves user intent
- never loses progress

If users stop thinking about Waypoint entirely — except when they need it — the UX is working.
