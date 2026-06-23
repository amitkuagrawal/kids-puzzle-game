# Puzzle Fun — Learning Loop MVP Design

**Date:** 2026-06-23
**Status:** Approved (design); pending spec review
**Author:** Amit + Claude

## 1. Vision

Turn the existing kids' jigsaw app into a **learning tool**: a child picks a topic they
want to learn about ("I want to learn flags"), solves a puzzle of an item in that topic,
and is rewarded with **kid-friendly facts** about what they just solved — with an option
to read more. The puzzle earns the lesson.

The reusable asset is the **content**: structured, two-reading-level facts per item,
served from the backend so packs can be added/updated without app releases.

## 2. Audience & Regulatory Position (locked)

- **This is a kids app.** It is child-directed under COPPA by design (mascot, playful UI,
  young-child topics). We commit to Google Play's **Families program** rather than trying
  to relabel as general-audience (which does not reduce COPPA liability for a kid-styled
  app).
- **Age-banded packs** broaden the market *within* the kids category. Every pack is tagged:
  `3-5`, `5-8`, `8-12`, or `all-ages`. This raises LTV (younger siblings, kids aging up)
  without leaving the Families lane.
- A future "mixed audience" expansion (serving teens/adults some packs via a neutral age
  screen) is explicitly **out of scope** for the MVP.

## 3. Monetization (locked)

- **Free to download** with a **generous free tier**: the full Animals pack (`isFree=true`)
  plus a **sampler** of the first ~10 flags from the paid Flags pack (`freeSampleCount=10`).
  Every free item has the full solve→learn loop, so the value is provable before paying.
  The sampler is what turns "let my kid try it" into "buy the rest of Flags."
- **Per-interest IAP packs** ($1.99–2.99 each: Flags, Dinosaurs, Space, …) — the proven
  Toca Life World model, matching the "buy the topic my kid cares about" intent.
- **Optional all-access subscription** ($29.99/yr) — unlocks all packs + monthly new packs
  + (future) parent progress reports. The compounding/recurring layer.
- **No ads in v1.** COPPA-compliant ads earn ~⅓ the eCPM, can't gate progress (illegal in
  kids apps), and hurt early reviews. Ads remain a **post-launch, remote-flagged,
  data-driven experiment** — the ad-free build does not block adding them later.
- Billing via **RevenueCat** (wraps Google Play Billing; multiple pack SKUs + subscription
  → a single `pro`/per-pack entitlement model; free under ~$2.5k/mo revenue).

## 4. Launch Reality (context)

Brand-new Google Play developer account → subject to the **20-tester, 14-day closed test**
before production access. Production-launch-today is impossible; the ~2 weeks of forced
testing time is **build time** for this learning loop. Create the account today so identity
verification + the test clock start now.

## 5. Phasing & Decomposition

The MVP is three sub-projects, each its own spec→plan→implement cycle. **This document
fully specifies Phase 1** (the heart of the product) and describes Phases 2–3 at design
level for context.

| Phase | Scope | Needed for… |
|---|---|---|
| **1. Learning Loop** | Content model, backend serving, learning screen, flags + animals content | Closed test (shows the real product) |
| **2. Monetization** | RevenueCat, IAP packs, subscription, entitlement gating, age-band surfacing | Public production launch |
| **3. Launch Prep** | EAS build, Play Console listing, privacy policy, data-safety, closed test | Production |
| **4. Content Ops (VA tooling)** | Extend admin dashboard with learning-content forms + CSV/spreadsheet batch import | Scaling content via a non-technical VA |

Testers in the closed test get everything unlocked, so Phase 1 alone makes a complete,
demonstrable build.

**Content operations (Phase 4):** Amit intends to hire a virtual assistant to author and
upload packs. The existing `backend/admin_dashboard.html` already does category management
and bulk image upload; Phase 4 extends it so a VA can fill the full `learn` payload
(structured facts, short/detail text, age-band, price) through **forms only — no JSON,
terminal, or code** — plus a **CSV/spreadsheet import** for batch pack prep. The
backend-served content model (§6.1–6.2) already makes this possible; Phase 4 is UI only.

---

## 6. Phase 1 — Learning Loop (implement now)

### 6.1 Content model

Extend the existing MongoDB collections (additive — existing fields unchanged).

**Pack** (extends existing `Category`):
```
name        string          # existing — e.g. "Flags"
icon        string          # existing — emoji
color       string          # existing
ageBand        "3-5"|"5-8"|"8-12"|"all-ages"  # NEW
isFree         bool         # NEW — entire pack free (e.g. Animals)?
freeSampleCount int         # NEW — first N items free even in a paid pack (sampler). 0 if none.
productId      string|null  # NEW — RevenueCat/Play SKU (null for free); used in Phase 2
order          int          # NEW — display ordering
```

**Item** (extends existing `PuzzleImage`):
```
name          string        # existing — e.g. "Brazil"
image_base64  string        # existing — doubles as the puzzle image
category      string        # existing — the pack name
learn:                      # NEW — the educational payload
  structured: { label: string, value: string }[]   # e.g. Capital→Brasília, Population→…
  shortText:  string        # ~2 kid-friendly sentences (age-appropriate)
  detailText: string        # ~1 paragraph, the "read more" version
  emoji:      string|null    # optional decorative (e.g. 🇧🇷)
```

`learn` is optional on the model so non-learning packs (e.g. "My Pictures") still work.

### 6.2 Backend endpoints (FastAPI)

- `GET /api/packs` → list of packs with metadata (no item bodies). Replaces/augments the
  category list the gallery already consumes.
- `GET /api/packs/{packName}/items` → items for a pack **including `learn`**. Phase 2 adds
  an entitlement check here (free packs always served; paid packs require entitlement).
- Existing `GET /api/puzzles/preloaded` stays for backward compatibility during migration.

For v1, paid-pack gating is a **client-side entitlement check** (RevenueCat) — acceptable
for a low-threat puzzle app. Server-side receipt validation is a documented Phase-2+
hardening, not a v1 blocker.

### 6.3 Learning screen (Expo / expo-router)

New route: `app/child/learn.tsx`.

**Flow:** `puzzle-game` win celebration → prominent **"Learn about {name} {emoji}"** button
→ `learn` screen → "Next puzzle" / "Back to pack".

**Layout** (uses existing design system — `constants/theme.ts`, Pip, theme tokens):
- Hero: the solved image + item name (display font).
- **Reading-level toggle** — two pills: **"Quick"** (default, `shortText`) and
  **"Tell me more"** (`detailText`). Toggling swaps the body text; the short version is
  always the landing state.
- **Structured facts** — a list/grid of `label: value` chips (Capital, Population, …).
- Pip mascot offers a one-line encouragement ("You learned about Brazil! 🎉").
- Footer buttons: **Next puzzle** (advances within the pack) and **Back to pack**.

The screen reads its content from params passed by `puzzle-game` (already carries
`puzzleId`/`puzzleName`/`imageBase64`); the `learn` payload is fetched with the pack items
and passed through, so the learning screen needs no extra network round-trip.

### 6.4 Content pipeline (flags flagship)

- **Structured fields** (capital, population, region, one standout stat): bulk-populated
  from **REST Countries API** + **CIA World Factbook** (public domain — safest license),
  snapshotted into the backend. No third-party API calls at runtime.
- **Flag images**: public-domain national flags (flag-icons / Wikimedia). Double as puzzle
  images. Avoid Wikipedia prose verbatim (CC BY-SA share-alike).
- **Kid prose** (`shortText` + `detailText`): AI-drafted from the anchored structured data,
  **human-verified by Amit**. This editorial layer is the differentiation.
- **Scope:** flagship **~30–40 most recognizable flags** for the closed test; expand to
  ~195 as a free post-launch content drop (also a re-engagement hook). Free Animals pack
  (~10 items) authored the same way.

### 6.5 Out of scope for Phase 1

Monetization/billing, ads, parent progress reports, quiz mode, flashcards, notifications,
audio narration, the full 195-flag set. The data model is built so these reuse the same
`learn` content with **zero re-authoring** later.

---

## 7. Future-proofing (design notes, not v1 work)

The `pack → item → {structured, shortText, detailText}` model is deliberately
format-agnostic so later phases can re-skin the same content as:
- **Quiz mode** (structured facts → questions)
- **Flashcards**
- **"Fact of the day"** parent-pull notifications

These are why the content model is the moat — build it cleanly once, reuse forever.

## 8. Success Criteria (Phase 1)

- A child can: pick the Flags pack → solve a flag → land on the Learn screen → read the
  Quick facts → toggle to "Tell me more" → continue to the next flag.
- Content for ~30–40 flags + ~10 animals served from the backend, each with verified
  structured fields + both reading levels.
- App builds clean (`tsc` passes, EAS build succeeds) and is demonstrable in the closed
  test with all content unlocked.
