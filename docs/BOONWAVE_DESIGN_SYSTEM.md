# BOONWAVE Design System

## Brand principle

BOONWAVE is a premium adaptive interface system: minimal, fluid, technological and calm. The identity may adapt to dark or light environments while preserving the same geometry, spacing, contrast hierarchy and motion character.

## Core rules

1. Premium, not decorative: no visual noise, aggressive neon, thick outlines or unnecessary effects.
2. Adaptive, not inconsistent: dark and light themes may change contrast and gradient direction, but not component geometry or interaction logic.
3. Type colour belongs to the card perimeter. Do not use separate vertical type bars.
4. Selection strengthens the existing type-colour perimeter glow; it must not introduce a second competing visual language.
5. Links remain visually independent from card type and selection state.
6. Motion must be restrained, cancellable and compatible with `prefers-reduced-motion`.
7. Controls must preserve readable labels, sufficient hit areas, safe-area spacing and semantic accessibility attributes.

## Node colours

- Project: violet / blue
- Process: cyan / blue
- Person: mint / teal
- Idea: warm amber
- Goal: magenta / pink

Colours are implemented through shared design tokens in `styles/boonwave-tokens.css`. Components consume tokens instead of hard-coded colours.

## Card states

### Resting

- dark premium surface;
- subtle full-perimeter type-colour outline;
- almost no external glow;
- readable typography and restrained contrast.

### Selected

- the same type-colour perimeter becomes brighter;
- a soft external halo may appear;
- geometry, dimensions and content remain unchanged.

### Link source

- source state uses a small explicit label;
- it must not replace or distort the type-colour perimeter.

## Platform readiness

Visual changes must remain isolated from domain, storage, gesture and link systems. Production integration must preserve:

- safe-area insets;
- reduced-motion support;
- semantic buttons and labels;
- deterministic state rendering;
- no remote runtime dependencies for core UI;
- consistent behaviour in Web and Capacitor/iOS builds.

This document is the baseline for future BOONWAVE UI work unless explicitly superseded.
