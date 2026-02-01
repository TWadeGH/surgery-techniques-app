# Linked Resource — Admin Form & Legal Spec

## Admin resource form (Add / Edit)

When building or updating the **Add Resource** and **Edit Resource** modals, include these fields so the backend can store them (already wired in `App.jsx`):

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| title | string | Yes | Display title |
| url | string | Yes | External URL |
| description | string | No | Short summary |
| type | string | Yes | Maps to `resource_type`: video, article, document, guide, podcast |
| **source_type** | enum | Recommended | `youtube`, `manufacturer`, `journal`, `institution`, `vimeo`, `other` (see `SOURCE_TYPES` in `utils/constants.js`) |
| **source_name** | string | Recommended | Display label for "View on [Source]", e.g. "YouTube", "Manufacturer Site" (see `SOURCE_DISPLAY`) |
| **content_type** | string | Optional | Same as type or more specific: video, pdf, article, guide, podcast |
| **copyright_license** | string | Optional | e.g. "CC BY", "All rights reserved" |
| **verified_at** | ISO date | Optional | Last verification date |
| **curation_notes** | string | Optional | Internal notes (not shown to users) |
| category_id | UUID | Optional | Category |
| duration_seconds | number | Optional | For videos |
| keywords | string | Optional | Comma-separated or stored as-is |

Run **`linked_resource_schema.sql`** in Supabase so `resources` has these columns and `resource_link_clicks` exists.

---

## Footer / copyright page wording (DMCA)

Suggested text for your **Copyright / Takedown Policy** page (footer link):

> **Third-party content**  
> We link to publicly available third-party content. Surgery Techniques App does not host or control that content and is not responsible for its accuracy, completeness, or legality. We remove links when notified of valid copyright infringement.
>
> **DMCA / Takedown**  
> If you believe a linked resource infringes your copyright, please use **Report Link** on the resource card or contact us at [Legal Email]. We respond to valid takedown notices promptly.

---

## Implemented

- **Resource card**: "View on [Source]" button, source line (Source • Type • Duration), "Third-party content" tag, short disclaimer.
- **External link modal**: "You are leaving Surgery Techniques" + DMCA-safe text; click tracked only after **Continue**.
- **Report Link**: Report type (General concern / Copyright infringement), auto-filled resource title and URL, submit to admins.
- **Click tracking**: `resource_link_clicks` table; `trackResourceLinkClick(resourceId, userId, sourceType)` in `lib/analytics.js`.
- **Constants**: `SOURCE_TYPES`, `SOURCE_DISPLAY`, `CONTENT_TYPE_LABELS`, `EXTERNAL_LINK_DISCLOSURE` in `utils/constants.js`.
