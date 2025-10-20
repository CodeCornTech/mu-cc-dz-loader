# CodeCorn™ DZ Lite (MU) — Dropzone-like upload for Elementor Forms

A minimal, dependency-free, **drag & drop** upload UI that mirrors the native `<input type="file">` so Elementor can serialize files correctly (AJAX + submissions + email). Includes hardened server-side validation hooks and **post-submit reset**. Built as **Must-Use** plugin with external, versioned assets and optional cache-busting for test environments.

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
  - [Accessibility](#accessibility)
  - [Development](#development)
  - [Release \& versioning](#release--versioning)
  - [Repo commands](#repo-commands)
  - [Support \& security](#support--security)
  - [License](#license)
  - [Company](#company)

---

## Highlights

-   **Pure JS/CSS**: no Dropzone.js or other vendors.
-   **Native-first**: keeps the hidden file input in sync (`DataTransfer`), so Elementor sees exactly what’s selected.
-   **Multiple files**: robust add/remove/re-add cycle without losing selections.
-   **No layout shift**: anti-flicker boot flags + minimal fade-in.
-   **Post-submit reset**: clears UI + native files after successful Elementor submission (multiple event paths covered).
-   **Cache-busting in test**: automatic `filemtime()` versioning when debug is on.
-   **Hardened validation hooks** (PHP) to block double extensions, bad MIME, oversize files.

---

## Requirements

-   WordPress **5.8+** (tested up to 6.7)
-   PHP **7.4+**
-   Elementor **3.18+** and Elementor Pro (for Forms) **3.18+**
-   jQuery present on front-end (standard in WP themes)

---

## Install

1. **Clone or copy** into `wp-content/mu-plugins/`:

```
wp-content/
└─ mu-plugins/
   ├─ mu-cc-dz-loader.php
   └─ codecorn/
      └─ dz-lite/
         ├─ assets/
         │  ├─ css/critical.css
         │  └─ js/{first.js,core.js,init.js}
         └─ vendors/   (not used)
```

2. **(Optional) Enable debug / cache-bust** in `wp-config.php`:

```php
define('CC_DZ_DEBUG', true);
```

3. Load any page with an Elementor Form upload field — the custom dropzone renders automatically.

---

## Project layout

```
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

-   Replaces the visual of Elementor’s upload field with a custom wrapper, **without** removing the native input.
-   Maintains a **logical queue** and mirrors it into `input.files` via `DataTransfer`, so submissions & emails are correct.
-   On **successful submit**, listens to multiple Elementor hooks (`form:submit:success`, `submit_success`, AJAX fallback) and **resets** UI + `input.files`.

---

## Configuration

### Debug & cache-busting

-   `CC_DZ_DEBUG` (bool): when `true`, assets are versioned with `filemtime()` → instant cache invalidation.

### Max files / size / accept

-   Set these in Elementor’s upload field (UI). The dropzone reads:

    -   `accept` attribute
    -   `multiple`
    -   data attributes (if present): `data-maxfiles`, `data-maxsize` (MB)

### Multiple naming

-   When `multiple` is enabled, the loader **enforces** `name="…[]"` to match Elementor’s serializer.

---

## Elementor integration

-   Auto-init on `elementor/frontend/init` → `frontend/element_ready/form.default`.
-   **No action required** in the form widget besides standard field settings.
-   **Post-submit reset** is triggered on:

    -   Instance event: `form:submit:success`
    -   Global event: `submit_success`
    -   Fallback: `ajaxComplete` (`elementor_pro_forms_send_form`)
    -   Native `submit` (last resort)

---

## Server-side validation (optional)

Add to a MU plugin (or theme `functions.php`) to harden validation:

```php
add_filter('elementor_pro/forms/validation/file', function ($record, $field_id) {
  $allowed_ext = ['jpg','jpeg','png','gif','webp','heic','heif','mp4','mov','avi','mkv','webm'];
  $max_mb = 30; $max_bytes = $max_mb * 1024 * 1024;

  if (empty($record['files'])) return;

  foreach ($record['files'] as $file) {
    if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
      throw new \Exception('Upload non valido.');
    }
    if (preg_match('/\.(php\d*|phtml|phar|pl|py|cgi|asp|js|sh|bin|exe|dll)(\.|$)/i', $file['name'])) {
      throw new \Exception('Formato non consentito.');
    }
    if (!empty($file['size']) && (int)$file['size'] > $max_bytes) {
      throw new \Exception('File troppo grande. Max '.$max_mb.'MB.');
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowed_ext, true)) {
      throw new \Exception('Carica solo foto o video.');
    }

    $check = wp_check_filetype_and_ext($file['tmp_name'], $file['name']);
    $real_ext = strtolower($check['ext'] ?? '');
    $real_mime = strtolower($check['type'] ?? '');

    if ($real_ext !== '' && !in_array($real_ext, $allowed_ext, true)) {
      throw new \Exception('Tipo di file non consentito.');
    }
    $is_img = $real_mime ? str_starts_with($real_mime, 'image/') : in_array($ext, ['jpg','jpeg','png','gif','webp','heic','heif'], true);
    $is_vid = $real_mime ? str_starts_with($real_mime, 'video/') : in_array($ext, ['mp4','mov','avi','mkv','webm'], true);
    if (!$is_img && !$is_vid) {
      throw new \Exception('Carica solo foto o video.');
    }
  }
}, 10, 2);
```

---

## Accessibility

-   Wrapper is focusable (`role="button"`, `tabindex="0"`).
-   Keyboard activation via **Enter/Space** opens the file picker.
-   `aria-live="polite"` on previews list for incremental updates.

---

## Development

No build tool is required. Plain ES5-ish JS for maximum WP compatibility.

**Local toggles**

-   Enable debug logs + cache-busting:

    ```php
    define('CC_DZ_DEBUG', true);
    ```

**Coding standards**

-   PHP: PSR-12-ish, strict types not enforced (MU context).
-   JS: no external dependencies; keep browser support aligned with WordPress core.

**Where to edit**

-   UI/logic: `assets/js/core.js`
-   Elementor bootstrap: `assets/js/init.js`
-   Minimal helpers/logger: `assets/js/first.js`
-   Styles/skin/anti-flicker: `assets/css/critical.css`

---

## Release & versioning

-   Semantic Versioning: **MAJOR.MINOR.PATCH**
-   Update `CC_DZ::VER` in `mu-cc-dz-loader.php` for each release.
-   **Prod builds**: set `CC_DZ_DEBUG` to `false` (or remove) so versions are static and cache-friendly.
-   **Test builds**: set `CC_DZ_DEBUG` to `true` to bypass caches using `filemtime()`.

**Tagging (example)**

```bash
git tag -a v1.3.0 -m "DZ Lite 1.3.0: stable resets, multiple re-add cycle"
git push --tags
```

---

## Repo commands

```bash
# Clone
git clone git@github.com:CodeCornTech/mu-cc-dz-lite.git
cd mu-cc-dz-lite

# Create MU layout locally (if you’re not cloning straight into wp-content)
mkdir -p wp-content/mu-plugins/codecorn/dz-lite/assets/{js,css}
# (copy files accordingly)

# Quick sanity checks
php -l mu-plugins/mu-cc-dz-loader.php
# (no build step required)

# Tag a release
git add .
git commit -m "chore(release): bump to 1.3.0"
git tag -a v1.3.0 -m "release: 1.3.0"
git push && git push --tags
```

---

## Support & security

-   **Issues**: use GitHub Issues. Provide:

    -   WP/Elementor versions
    -   Theme + list of active plugins
    -   Browser/OS
    -   Steps to reproduce + console/network logs

-   **Security**: for any vulnerability or suspicion, contact us privately. Do **not** open public issues with exploit details.

---

## License

MIT © CodeCorn™ Technology. See `LICENSE`.

---

## Company

**CodeCorn™ Technology** — boutique engineering for WordPress/Elementor stacks.

-   Focus: **front-end UX without dependencies**, **robust server-side hardening**, **perf & DX discipline**.
-   GitHub: `@CodeCornTech`

---
