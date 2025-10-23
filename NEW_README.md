# CodeCorn™ DZ Lite (MU) — Dropzone-like upload for Elementor Forms

A minimal, dependency-free **drag & drop** upload UI that mirrors the native `<input type="file">` so Elementor can serialize files correctly (AJAX + submissions + email).  
Includes hardened server-side validation hooks and **post-submit reset**.  
Built as a **Must-Use** plugin with external, versioned assets and optional cache-busting for test environments.

---

## Table of contents

- [CodeCorn™ DZ Lite (MU) — Dropzone-like upload for Elementor Forms](#codecorn-dz-lite-mu--dropzone-like-upload-for-elementor-forms)
  - [Table of contents](#table-of-contents)
  - [Highlights](#highlights)
  - [Requirements](#requirements)
  - [Install](#install)
  - [Project layout](#project-layout)
  - [How it works](#how-it-works)
  - [Configuration](#configuration)
    - [Debug \& cache-busting](#debug--cache-busting)
    - [Max files / size / accept](#max-files--size--accept)
    - [Multiple naming](#multiple-naming)
  - [Elementor integration](#elementor-integration)
  - [Server-side validation (optional)](#server-side-validation-optional)
    - [Enable / configure via constants](#enable--configure-via-constants)
    - [Override via filters](#override-via-filters)
  - [Accessibility](#accessibility)
  - [Development](#development)
  - [Release \& versioning](#release--versioning)
  - [Support \& security](#support--security)
  - [License](#license)
  - [Company](#company)

---

## Highlights

-   **Pure JS / CSS** — no Dropzone.js or external vendors
-   **Native-first** — keeps the hidden file input in sync (`DataTransfer`), so Elementor sees exactly what’s selected
-   **Multiple files** — robust add / remove / re-add cycle without losing selections
-   **No layout shift** — anti-flicker boot flags + minimal fade-in
-   **Post-submit reset** — clears UI + native files after successful Elementor submission
-   **Cache-busting in test** — automatic `filemtime()` versioning when debug is on
-   **Hardened validation hooks** (PHP) to block double extensions, bad MIME, oversize files

---

## Requirements

-   WordPress **5.8 +** (tested up to 6.7)
-   PHP **7.4 +**
-   Elementor **3.18 +** and Elementor Pro (Forms) **3.18 +**
-   jQuery present on front-end (standard in WP themes)

---

## Install

1. **Clone / copy** into `wp-content/mu-plugins/`

```text
    wp-content/
    └─ mu-plugins/
       ├─ mu-cc-dz-loader.php
       └─ codecorn/
          └─ dz-lite/
             ├─ assets/
             │  ├─ css/critical.css
             │  └─ js/{first.js, core.js, init.js}
             └─ vendors/  (not used)
   ```

2. **Optional — enable debug / cache-bust** in `wp-config.php`

    ```php
    define('CC_DZ_DEBUG', true);
    ```

3. Load any page with an Elementor Form upload field — the custom dropzone renders automatically.

---

## Project layout

```text
mu-cc-dz-loader.php        # MU loader class (CC_DZ): enqueue, preload, flags, cache-bust
codecorn/dz-lite/
  assets/css/critical.css  # Skin + anti-flicker rules
  assets/js/first.js       # Bootstrap + logger
  assets/js/core.js        # Dropzone logic (UI + queue + DT sync + reset)
  assets/js/init.js        # Elementor hooks + boot complete
  vendors/                 # (empty) no third-party deps
```

---

## How it works

-   Replaces the visual of Elementor’s upload field with a custom wrapper without removing the native input.
-   Maintains a **logical queue** and mirrors it into `input.files` via `DataTransfer`, so submissions & emails are correct.
-   On **successful submit**, listens to multiple Elementor hooks and **resets** UI + `input.files`.

---

## Configuration

### Debug & cache-busting

`CC_DZ_DEBUG` → when true, assets are versioned with `filemtime()` for instant cache invalidation.

### Max files / size / accept

Set these in Elementor’s upload field UI.
The dropzone reads: `accept`, `multiple`, `data-maxfiles`, `data-maxsize` (MB).

### Multiple naming

When `multiple` is enabled, the loader adds `[]` to the field name for proper serialization.

---

## Elementor integration

Auto-init on `elementor/frontend/init` → `frontend/element_ready/form.default`.
No manual action needed.
Resets on events:

-   `form:submit:success`
-   `submit_success`
-   `ajaxComplete (elementor_pro_forms_send_form)`
-   native `submit` (fallback)

---

## Server-side validation (optional)

### Enable / configure via constants

```php
define('CC_DZ_VALIDATE', true);   // enable server-side validation
define('CC_DZ_DEBUG', true);      // optional: verbose logs + cache-bust
```

### Override via filters

```php
// Toggle runtime (priority after constant)
add_filter('ccdz_validation_enabled', '__return_true');  // or __return_false

// Global extensions allowed
add_filter('ccdz_allowed_ext', function(array $ext, $field_id){
    if ($field_id === 'cv_upload') return ['pdf','jpg','jpeg','png'];
    return $ext;
}, 10, 2);

// Global max size (MB)
add_filter('ccdz_max_mb', function($mb, $field_id){
    return ($field_id === 'video_clip') ? 80 : 30;
}, 10, 2);

// Per-field rules (callback that can mutate both arrays)
add_filter('ccdz_field_rules', function(){
    return function($field_id, &$allowed_ext, &$max_mb){
        if ($field_id === 'foto_profilo') {
            $allowed_ext = ['jpg','jpeg','png','webp','heic','heif'];
            $max_mb = 10;
        }
    };
});
```

---

## Accessibility

-   Focusable wrapper (`role="button"`, `tabindex="0"`)
-   Keyboard activation (**Enter / Space**) opens picker
-   `aria-live="polite"` for preview list updates

---

## Development

No build tools needed (plain ES5-compatible JS).

**Local toggles**

```php
define('CC_DZ_DEBUG', true);
```

**Coding standards**

PHP ≈ PSR-12, JS no deps, match WP browser support.

**Edit points**

`core.js` → UI logic
`init.js` → Elementor bootstrap
`first.js` → logger + guards
`critical.css` → skin + anti-flicker

---

## Release & versioning

-   Semantic Versioning (MAJOR.MINOR.PATCH)
-   Update `CC_DZ::VER` each release
-   Prod → `CC_DZ_DEBUG false` for stable assets
-   Test → `CC_DZ_DEBUG true` for `filemtime()` cache-bust

---

## Support & security

Open GitHub Issues with full context (WP/Elementor versions, theme, plugins, browser, logs).
For security reports use private contact, never public issues.

---

## License

MIT © CodeCorn™ Technology

---

## Company

**CodeCorn™ Technology** — boutique engineering for WordPress / Elementor stacks.
Focus on dependency-free UX, server-side hardening, and performance-first discipline.
GitHub: [@CodeCornTech](https://github.com/CodeCornTech)
