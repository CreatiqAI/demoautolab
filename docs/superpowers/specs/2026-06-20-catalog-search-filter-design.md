# Catalog Search & Filter Refactor — Design

**Date:** 2026-06-20
**Area:** Customer-facing catalog (`src/pages/Catalog.tsx`)
**Goal:** Make product discovery friendly and fast. Fix overly strict search and redesign the filter/results UX.

## Problem

The current catalog:
- Loads **all** active+approved products client-side, then filters in JS.
- Search is a naive whole-string `String.includes()` against individual fields. Typing `honda casing` returns nothing even though "Honda Accord Casing" exists, because no single field contains that contiguous substring. `08 accord casing` also fails (no year/token awareness).
- Does **not** search inside a product's components, so buyers searching for a part contained in a product can't find it.
- Filters are plain dropdowns (mobile) / button lists (desktop); desktop renders every product with no pagination.

## Solution

### Part 1 — Server-side smart search (the core fix)

New Postgres RPC `catalog_search_products(...)`, adapted from the existing proven
`chatbot_smart_search` function. It:

- **Tokenizes** the query — each word matched independently, so word order and
  extra words don't break results (`honda casing`, `casing honda`, `08 accord casing`).
- **Fuzzy + ranked** via `pg_trgm` `similarity()` — returns closest matches with a
  relevance score, not all-or-nothing.
- **Searches components** — a product surfaces when the query matches the name of a
  component it contains (`product_components` → `component_library`).
- **Year-aware** — numeric tokens like `08` / `2008` are matched against each
  product's `year_from…year_to` range (`08` → 2008).
- Enforces `active = true AND approval_status = 'APPROVED'`.
- Accepts `category_id`, `brand`, `sort` (relevance | newest | featured), `limit`,
  `offset`; returns card fields + a window `total_count` for pagination.

Signature:
```
catalog_search_products(
  p_query text default '',
  p_category uuid default null,
  p_brand text default null,
  p_sort text default 'relevance',
  p_limit int default 24,
  p_offset int default 0
)
returns table(
  id uuid, name text, slug text, brand text, model text,
  year_from int, year_to int, featured boolean,
  category_id uuid, category_name text, vendor_name text,
  image_url text, image_type text, component_count int,
  match_score real, total_count bigint
)
```

Empty query = browse mode (no score filter, ordered by sort). Non-empty = search
mode (score > 0, ordered by relevance/sort). Adds trigram GIN indexes on
`products_new(name, model)` and `component_library(name)` for speed.

### Part 2 — Filter & results UX redesign (`Catalog.tsx`)

- **Search bar is the hero** — prominent, debounced (~250 ms), with clear button
  and a subtle searching indicator.
- **Filters as chips** — Category and Brand as scrollable selectable chips with
  active highlight; removable active-filter pills above the grid.
- **Sort control** — Relevance (default while searching) / Newest / Featured.
- **Server-driven pagination** on both mobile and desktop (replaces "load all on
  desktop"). 24 per page.
- **Smarter empty state** — closest ranked matches still show; true empty only when
  nothing scores.
- Keeps the existing visual language (lime accent, card layout, hover specs overlay).
  URL query params (`search`, `brand`, `category`, plus `sort`, `page`) preserved.

## Out of scope / deliberate non-changes
- **No price on cards** — `products_new` has no price column (prices live in
  `component_library`); cards stay price-free, matching current behavior.
- No restyle of the card's visual structure beyond what new data enables.

## Resilience
Frontend calls the RPC; on RPC error (e.g. not yet deployed) it falls back to a
basic direct `products_new` query so the catalog never hard-breaks.
