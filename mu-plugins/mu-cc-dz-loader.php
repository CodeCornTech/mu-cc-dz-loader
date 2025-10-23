<?php
/**
 * Plugin Name:  CodeCorn™ DZ Lite (MU)
 * Description:  Dropzone-like UI per Elementor Form (compatibilità totale con input nativo + reset post-submit). Asset esterni versionati + validazione server-side togglabile.
 * Version:      1.3.1
 * Author:       CodeCorn™ Technology
 * License:      MIT
 */


if (!defined('ABSPATH'))
    exit;

final class CC_DZ
{
    public const VER = '1.3.1';

    private const BASE_DIR = 'mu-plugins/codecorn/dz-lite';
    private const H_CSS = 'cc-dz-css';
    private const H_FIRST = 'cc-dz-first';
    private const H_CORE = 'cc-dz-core';
    private const H_INIT = 'cc-dz-init';

    public static function boot(): void
    {
        add_action('plugins_loaded', [__CLASS__, 'hooks'], 0);
    }

    public static function hooks(): void
    {
        // Flags & enqueue
        add_action('wp_head', [__CLASS__, 'head_critical'], 0);
        add_action('wp_enqueue_scripts', [__CLASS__, 'enqueue'], 5);
        add_action('elementor/editor/after_enqueue_scripts', [__CLASS__, 'enqueue'], 5);

        // Toggles (costante → filtro → default)
        add_filter('ccdz_debug', fn($v) => defined('CC_DZ_DEBUG') ? CC_DZ_DEBUG : (bool) $v);
        add_filter('ccdz_validation_enabled', fn($v) => defined('CC_DZ_VALIDATE') ? CC_DZ_VALIDATE : (bool) $v);

        // Attiva validazione server-side solo se abilitata
        if (apply_filters('ccdz_validation_enabled', false)) {
            add_filter('elementor_pro/forms/validation/file', [__CLASS__, 'validate_files'], 10, 2);
        }
    }

    /** URL helper */
    private static function url(string $rel): string
    {
        return content_url(self::BASE_DIR . '/' . ltrim($rel, '/'));
    }
    /** Path helper assoluto per filemtime (cache-bust in dev) */
    private static function path(string $rel): string
    {
        return WP_CONTENT_DIR . '/' . self::BASE_DIR . '/' . ltrim($rel, '/');
    }

    public static function head_critical(): void
    {
        // aggiungi classe html.ccdz-booting prima del paint
        add_filter('language_attributes', fn($out) => "$out class=\"ccdz-booting\"");

        // Preload CSS/JS
        add_filter('wp_resource_hints', function ($urls, $rel) {
            if ($rel === 'preload') {
                $urls[] = ['href' => self::url('assets/css/critical.css'), 'as' => 'style', 'crossorigin' => true];
                $urls[] = ['href' => self::url('assets/js/core.js'), 'as' => 'script', 'crossorigin' => true];
            }
            return $urls;
        }, 10, 2);
    }

    /** Versione asset: in debug usa filemtime per invalidare cache */
    private static function v(string $rel, string $fallback): string
    {
        $debug = (bool) apply_filters('ccdz_debug', false);
        if ($debug) {
            $p = self::path($rel);
            if (is_file($p))
                return (string) filemtime($p);
        }
        return $fallback ?: self::VER;
    }

    public static function enqueue(): void
    {
        $debug = (bool) apply_filters('ccdz_debug', false);

        // CSS critico
        wp_enqueue_style(
            self::H_CSS,
            self::url('assets/css/critical.css'),
            [],
            self::v('assets/css/critical.css', self::VER)
        );

        // JS: first → core → init (HEAD)
        wp_register_script(
            self::H_FIRST,
            self::url('assets/js/first.js'),
            ['jquery'],
            self::v('assets/js/first.js', self::VER),
            false
        );
        wp_register_script(
            self::H_CORE,
            self::url('assets/js/core.js'),
            ['jquery', self::H_FIRST],
            self::v('assets/js/core.js', self::VER),
            false
        );
        wp_register_script(
            self::H_INIT,
            self::url('assets/js/init.js'),
            ['jquery', self::H_CORE],
            self::v('assets/js/init.js', self::VER),
            false
        );

        wp_localize_script(self::H_CORE, 'CC_DZ_OPTS', [
            'debug' => $debug,
        ]);

        wp_enqueue_script(self::H_FIRST);
        wp_enqueue_script(self::H_CORE);
        wp_enqueue_script(self::H_INIT);
    }

    /* =========================
     *  VALIDAZIONE SERVER-SIDE
     * ========================= */

    // Polyfill startsWith per PHP 7.4
    private static function starts_with(string $hay, string $needle): bool
    {
        return $needle === '' ? true : (strncmp($hay, $needle, strlen($needle)) === 0);
    }

    /**
     * Validazione file Elementor (toggle via CC_DZ_VALIDATE o filtro 'ccdz_validation_enabled')
     * Filtri utili:
     * - 'ccdz_allowed_ext'  → array estensioni globali
     * - 'ccdz_max_mb'       → int MB globali
     * - 'ccdz_field_rules'  → callable($field_id, &$allowed_ext, &$max_mb) per regole per-campo
     */
    public static function validate_files(array $record, string $field_id): void
    {
        // Default globali
        $allowed_ext = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'mp4', 'mov', 'avi', 'mkv', 'webm'];
        $allowed_ext = (array) apply_filters('ccdz_allowed_ext', $allowed_ext, $field_id);

        $max_mb = (int) apply_filters('ccdz_max_mb', 30, $field_id);
        $max_mb = max(1, $max_mb);
        $max_bytes = $max_mb * 1024 * 1024;

        // Per-field override (callback opzionale)
        $field_rules = apply_filters('ccdz_field_rules', null);
        if (is_callable($field_rules)) {
            // Il callback può modificare $allowed_ext e $max_mb per riferimento
            $field_rules($field_id, $allowed_ext, $max_mb);
            $max_mb = max(1, (int) $max_mb);
            $max_bytes = $max_mb * 1024 * 1024;
        }

        if (empty($record['files']))
            return;

        foreach ($record['files'] as $file) {
            // Esiste file temporaneo?
            if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
                throw new \Exception('Upload non valido.');
            }

            // Doppie estensioni / eseguibili
            if (preg_match('/\.(php\d*|phtml|phar|pl|py|cgi|asp|js|sh|bin|exe|dll)(\.|$)/i', $file['name'])) {
                throw new \Exception('Formato non consentito.');
            }

            // Dimensione
            if (!empty($file['size']) && (int) $file['size'] > $max_bytes) {
                throw new \Exception('File troppo grande. Max ' . $max_mb . 'MB.');
            }

            // Estensione dichiarata
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, $allowed_ext, true)) {
                throw new \Exception('Carica solo foto o video.');
            }

            // Verifica tipo reale con WP
            $check = wp_check_filetype_and_ext($file['tmp_name'], $file['name']);
            $real_ext = strtolower($check['ext'] ?? '');
            $real_mime = strtolower($check['type'] ?? '');

            // Fallback HEIC/HEIF: alcuni server non li risolvono
            if ($real_ext === '' && in_array($ext, ['heic', 'heif'], true)) {
                if (function_exists('mime_content_type')) {
                    $tmp = @mime_content_type($file['tmp_name']);
                    if (is_string($tmp))
                        $real_mime = strtolower($tmp);
                }
            }

            // Blocca se WP rileva extension diversa e non in whitelist
            if ($real_ext !== '' && !in_array($real_ext, $allowed_ext, true)) {
                throw new \Exception('Tipo di file non consentito.');
            }

            // Categoria MIME: accetta solo immagini o video
            $is_img = $real_mime ? self::starts_with($real_mime, 'image/')
                : in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'], true);

            $is_vid = $real_mime ? self::starts_with($real_mime, 'video/')
                : in_array($ext, ['mp4', 'mov', 'avi', 'mkv', 'webm'], true);

            if (!$is_img && !$is_vid) {
                throw new \Exception('Carica solo foto o video.');
            }
        }
    }
}

CC_DZ::boot();

/**
 * ============================================================
 * 🧩 COME SI ABILITA / CONFIGURA — VALIDAZIONE SERVER-SIDE
 * ============================================================
 *
 * ▶️ 1. Abilita la validazione (come il debug) nel file wp-config.php:
 *
 *    define('CC_DZ_VALIDATE', true);
 *    // opzionale:
 *    define('CC_DZ_DEBUG', true);
 *
 * ▶️ 2. Override via filtri (in un MU-plugin o nel functions.php del tema):
 *
 *    // Toggle runtime (priorità su default, ma dopo la costante)
 *    add_filter('ccdz_validation_enabled', '__return_true');  // o __return_false
 *
 *    // Estensioni consentite globali
 *    add_filter('ccdz_allowed_ext', function(array $ext, $field_id){
 *        // esempio: per il campo 'cv_upload' consenti solo PDF e immagini
 *        if ($field_id === 'cv_upload') return ['pdf','jpg','jpeg','png'];
 *        return $ext;
 *    }, 10, 2);
 *
 *    // Limite dimensione globale (MB)
 *    add_filter('ccdz_max_mb', function($mb, $field_id){
 *        return ($field_id === 'video_clip') ? 80 : 30;
 *    }, 10, 2);
 *
 *    // Regole per-campo (callback unico che può cambiare entrambi)
 *    add_filter('ccdz_field_rules', function(){
 *        return function($field_id, &$allowed_ext, &$max_mb){
 *            if ($field_id === 'foto_profilo') {
 *                $allowed_ext = ['jpg','jpeg','png','webp','heic','heif'];
 *                $max_mb = 10;
 *            }
 *        };
 *    });
 *
 * ============================================================
 */
