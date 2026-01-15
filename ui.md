# UI Guidelines

## Purpose of this document

This document defines the **visual principles and constraints** for Waypoint.

The goal is not to prescribe exact colors or components, but to ensure that all UI decisions reinforce:
- clarity
- calm
- longevity
- trust

Waypoint is a tool people keep installed for years.  
The interface should age gracefully and never demand attention.

---

## UI philosophy

### Calm over clever
Waypoint should feel:
- quiet
- stable
- intentional

Avoid:
- novelty UI patterns
- trendy visuals
- attention-grabbing effects
- unnecessary animation

If a visual element does not improve comprehension, it should not exist.

---

### Visual humility
Waypoint exists *alongside* content, not above it.

The UI should:
- defer to the content the user is consuming
- never feel like a destination itself
- feel lightweight even when feature-rich

---

## Color

### Principles
- Neutral by default
- Accent color used sparingly and purposefully
- No meaning encoded *only* by color

Color should communicate state, not personality.

### Recommended approach
- Grayscale base (backgrounds, text, separators)
- One primary accent color for:
  - active selection
  - primary action
  - current waypoint
- Optional secondary accent for warnings/errors only

Avoid:
- gradients
- large color blocks
- decorative color usage

---

## Typography

### Principles
- Readability over branding
- Familiar system fonts preferred
- No novelty fonts

This is a tool, not a brand billboard.

### Guidelines
- Use system UI fonts where possible
- Clear hierarchy:
  - Title
  - Section label
  - Body text
  - Secondary/meta text
- Avoid excessive font weights or styles

Text should remain legible at small sizes and on low-contrast displays.

---

## Layout & spacing

### Density
Waypoint should feel:
- compact
- scannable
- not cramped

Users should be able to see:
- multiple works
- their current status
- their last waypoint
without scrolling excessively.

### Spacing rules
- Consistent spacing units
- Clear separation between items
- Group related controls visually

Avoid:
- floating elements without context
- inconsistent padding
- visual clutter

---

## Icons

### Usage
Icons should:
- support text, not replace it
- be simple and universally recognizable

Text labels are preferred for clarity.

### Style
- Simple line or filled icons
- No novelty or decorative icons
- Consistent stroke/weight

Avoid icons that imply navigation, maps, or GPS.

Waypoint is a metaphor, not a map.

---

## Animation & motion

### Default stance: minimal
Motion should be:
- subtle
- fast
- functional

Acceptable uses:
- state changes
- confirmations
- simple transitions

Avoid:
- animated entrances
- bouncing, pulsing, or looping motion
- anything that draws attention repeatedly

If motion can be removed without harming clarity, remove it.

---

## Empty states

Empty states are part of the core experience.

They should:
- explain what the user can do next
- be calm and instructional
- never feel like an error

Avoid jokes, mascots, or playful copy.

---

## Accessibility

UI must be usable by default.

At minimum:
- sufficient contrast
- keyboard navigation
- readable text sizes
- focus indicators

Accessibility is not a feature; it is a baseline.

---

## Summary

A successful Waypoint UI:
- feels quiet
- feels stable
- never surprises the user visually
- prioritizes legibility and clarity
- still feels good after thousands of uses

If the UI disappears into muscle memory, it is doing its job.
