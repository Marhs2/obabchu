# DESIGN.md (오밥추)

**Provenance:** Agent-proposed direction. There was no existing brand file. The owner asked for a product-grounded brief; this file is that brief, not a user-authored brand guide. Taste here can still lean toward default AI polish. Treat it as working direction until a human edits it.

**Design Read:** Utility lunch-picker screens for people choosing nearby food now, in a street-ticket × map-app visual language. Dial **ENERGY 2 / RHYTHM 2 / MOTION 1**.

## Identity

오밥추 answers one question: 오늘 밥 뭐 먹지?

It is a location-based picker. The user either takes a random nearby restaurant or narrows by category and per-person budget, then sees the pick on a map. That loop (조건 → 추천 → 지도) is the product. The site is not a marketplace, a review magazine, or a growth landing page.

## Personality

Warm, direct, local Korean. Lightly playful the way a coworker saying "그냥 이거 먹자" is playful. Adult. No startup hype, no fake stats, no "AI-powered" language.

UI copy stays in Korean, short, and specific to the next tap.

## Audience and setting

People on a lunch break (or dinner after work) who already know they will eat nearby and need a decision. The phone is in one hand. The map must stay usable. Location may be denied; the app already falls back to the 용산 dataset centroid, and the UI must say that plainly.

## Visual language

Street-food clarity mixed with map-app utility.

- **Paper, not chrome.** Warm paper neutrals, ink text, one chili-red accent (고추장 / 식권 도장). Light is the default because this is a daytime food decision. A working dark theme exists for evening use; it keeps the same warm ink-and-chili language, not a blue-black "tech" skin.
- **식권 motif.** Ticket-like panels, a dashed perforation divider, and a square 도장 wordmark using the syllable 밥. This is typography, not a generated mascot or sparkle logo.
- **One focal action.** On every screen, one primary control: 근처에서 고르기, 이걸로 추천, 로그인, or 기록 비우기. Accent color lives there (and on the active filter), not on every chip and icon.
- **Map + result lead.** The recommend page is a control strip plus a result/map stage. Landing does not invent a feature grid or a numbered "how it works" ritual. History is a chronological list of real picks.

## Palette (2 cores + 1 accent)

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| Paper | `#F4EDE1` | `#1C1712` | Page ground |
| Ink | `#2A2118` | `#F3EBE0` | Text and rules |
| Chili | `#C43C17` | `#EC734C` | Primary action only |

Dark chili: `#E25A32` on dark paper still needs AA for large controls; body text stays ink-on-paper, never chili-on-paper for long copy.

Supporting neutrals (not extra brand colors): ticket surface, hairline rules, muted ink for secondary text. Status green/red only on real location or form state.

## Type

- **Noto Serif KR** for the wordmark and page titles. Reason: a lunch ticket / 메뉴판 voice, not a SaaS grotesque.
- **Noto Sans KR** for controls, forms, and map chrome. Reason: hangul at UI sizes stays even and readable.

No Inter, Poppins, or wide-tracked English labels. No decorative emoji in headings or buttons.

## Space, radius, elevation, focus

- Space scale: 4 / 8 / 12 / 16 / 24 / 40 / 64. Mobile uses the lower steps; desktop opens the upper ones.
- Radius: 4px chips and inputs, 8px buttons and cards, 12px stage panels. Not pills.
- Elevation: most surfaces are flat with a 1px ink-tinted rule. Only the current recommendation card lifts (one shadow).
- Focus: a 2px chili ring with a 2px paper offset on every interactive control. Never `outline: none` without this replacement.

## Motion

MOTION 1: hover and press feedback only. No scroll-reveal, no looping pulses, no floating cards.

## Page jobs

1. **홈:** Ask the lunch question. Send people to 추천. Explain the two real modes and the location fallback. Nothing else.
2. **추천:** Set mode, category, optional budget, radius. Show empty / loading / error / result. Keep Leaflet working.
3. **기록:** Logged-out, loading, empty, error, and a list of saved picks with delete.
4. **로그인 / 회원가입:** Short forms with associated labels, inline errors, and a reason (기록 저장).

## Honesty rules

- No invented user counts, ratings about the product, or partner logos.
- No navbar items that are not real pages.
- Location status and API errors use the server's real messages, plus a next step.
- Wordmark is the letters 오밥추 plus the 밥 stamp. No generated app icon asset.

## Decision log (R-31)

- Light default: lunch is a daylight errand; dark is optional, not the brand.
- Chili accent: one food-warm signal that reads as 매운 / 도장, not a blue CTA.
- Serif titles: menu-board character without a custom display face.
- Ticket motif: unique to this product (식권) and repeated, so swapping the name still feels like a lunch picker.
- No 3-step "작동 방식" block: the real flow is two choices (random vs filters), not a ritual.
- Bottom nav on small screens: thumb reach for 홈 / 추천 / 기록; header stays compact.
