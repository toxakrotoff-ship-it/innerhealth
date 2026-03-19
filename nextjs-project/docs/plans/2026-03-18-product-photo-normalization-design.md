# 2026-03-18 — Product photo normalization (catalog cards)

## Problem

Catalog product cards render product photos with `object-fit: cover`. Source images vary in aspect ratio and subject framing (jar/pouch placed higher/lower), causing inconsistent top/bottom padding (“stripe” at top) and occasional visual overlap of the product with the information area below the image.

## Goals

- Make catalog card images **visually uniform** across products.
- Keep product subject (jar/pouch) **higher in the frame** to avoid colliding with the card’s title/price area.
- Provide **admin guidance** to reduce future inconsistencies.

## Non-goals

- Building a full cropping UI/editor in admin (manual cropper).
- Changing public product detail/gallery rendering (unless necessary later).

## Decision

Use **server-side normalization at upload time** (Sharp):

- Convert uploaded product image to **WebP**.
- Normalize the primary `photo` to a **square 1200×1200** output.
- Use **cover crop** with **top/center** gravity so the subject appears higher.
- Keep originals in `photos[]` only as a historical/source list (no extra DB fields).

This implements “B) normalization on upload” and the specific storage choice “Б) overwrite `photo` with the normalized square”.

## User experience changes (Admin)

In `ImageDropzone`:

- Display a small helper text with recommended requirements:
  - **1200×1200** square
  - Subject placed slightly higher (leave bottom breathing room)
- Show selected image’s **pixel dimensions** and warn when far from square (non-blocking).

## Backend changes (API)

### `/api/admin/products/upload-image`

- Validate MIME type (existing).
- Use Sharp pipeline to:
  - Optionally downscale overly large images (existing `MAX_WIDTH` can remain for input safety).
  - Produce **normalized 1200×1200 WebP** for the primary `photo`:
    - `resize(1200, 1200, { fit: 'cover', position: 'top' })`
  - Generate `blurDataURL` from the normalized output to match what users see in cards.
- Save the normalized file into `public/uploads/products/` and set `photo` to that URL.
- Add the URL (and `blurDataURL`) to `photos[]` first position (existing behavior).

### `/api/admin/products/upload-image-from-url`

Apply the same normalization (1200×1200 cover, top/center) to match parity.

## Frontend changes (Catalog cards)

`ProductCard` should render `photo` without per-image tweaks:

- `fill`
- `object-cover object-top` (or `object-center` if top cropping is fully handled server-side)
- Remove any hardcoded pixel `objectPosition` offsets.

## Migration / Backfill (optional)

Existing products may still have non-normalized `photo`s. Options:

- Leave as-is (new uploads become uniform going forward).
- Add a one-off admin action/script to reprocess current `photo` URLs through the same Sharp pipeline.

## Risks / Considerations

- Cover-cropping can cut off parts of a subject if the original is framed too tight. Admin guidance mitigates this.
- Ensure we do not upscale tiny images aggressively; if input is smaller than 1200px, keep quality acceptable (allow upscaling or set `withoutEnlargement: true` and accept smaller output). Decide in implementation.

## Success criteria

- On `/catalog`, product cards show **consistent framing** with minimal top “stripe” variance.
- Product subjects do not visually clash with the card info area.
- Admin upload UI clearly communicates recommended photo constraints.

