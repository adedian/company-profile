<?php
/**
 * Shared helpers: config access, URLs, escaping, images, SEO.
 */

function cfg(string $key, $default = null)
{
    return $GLOBALS['cfg'][$key] ?? $default;
}

function site(?string $key = null)
{
    return $key === null ? $GLOBALS['site'] : ($GLOBALS['site'][$key] ?? null);
}

function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/* ------------------------------------------------------------------ URLs */

/** Folder the site is served from, e.g. "/websitehme" on XAMPP or "" on the production web root. */
function base_path(): string
{
    static $base = null;
    if ($base === null) {
        $dir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/index.php'));
        $base = ($dir === '/' || $dir === '.') ? '' : rtrim($dir, '/');
    }
    return $base;
}

/**
 * Site-relative URL (works in a sub-folder). Pages get the active language prefix ("/en/" for English, nothing for
 * Indonesian); static files under assets/ and the sitemap/robots endpoints are shared by both languages.
 */
function url(string $path = ''): string
{
    $p = ltrim($path, '/');
    $prefix = (current_lang() !== DEFAULT_LANG && !lang_is_shared_path($p)) ? current_lang() . '/' : '';
    return base_path() . '/' . $prefix . $p;
}

function is_local(): bool
{
    $host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? 'localhost'));
    if (in_array($host, cfg('local_hosts', []), true)) {
        return true;
    }
    return (bool) preg_match('/\.(test|localhost|local)$/', $host);
}

/** Absolute URL on the production domain (used for canonical, Open Graph, sitemap, JSON-LD). */
function prod_url(string $path = ''): string
{
    return rtrim(cfg('production_url'), '/') . '/' . ltrim($path, '/');
}

/** Static asset URL with a cache-busting version taken from the file's modification time. */
function asset(string $rel): string
{
    $file = ROOT . '/assets/' . ltrim($rel, '/');
    $v = is_file($file) ? '?v=' . filemtime($file) : '';
    return url('assets/' . ltrim($rel, '/')) . $v;
}

function redirect(string $location, int $status = 302): void
{
    header('Location: ' . $location, true, $status);
    exit;
}

/* ------------------------------------------------------------------ images */

function image_manifest(): array
{
    static $m = null;
    return $m ??= require INC . '/data/images.php';
}

/**
 * Responsive <img> for an image in assets/images/wp (key = file name without extension).
 * Options: class, sizes, priority (eager + fetchpriority=high, for the LCP image), loading, width, height.
 */
function img(string $key, string $alt, array $o = []): string
{
    $m = image_manifest();
    if (!isset($m[$key])) {
        return '';
    }
    [$w, $h, $variants] = $m[$key];
    $dir = url('assets/images/wp/');

    $srcset = [];
    foreach ($variants as $vw) {
        $srcset[] = $dir . $key . '-' . $vw . '.webp ' . $vw . 'w';
    }
    $srcset[] = $dir . $key . '.webp ' . $w . 'w';

    $attrs = [
        'src'    => $dir . $key . '.webp',
        'alt'    => $alt,
        'width'  => $o['width'] ?? $w,
        'height' => $o['height'] ?? $h,
    ];
    // defer: keep the file out of the first paint; scripts copy data-src/data-srcset into src/srcset later
    $defer = !empty($o['defer']);
    if (count($srcset) > 1) {
        $attrs[$defer ? 'data-srcset' : 'srcset'] = implode(', ', $srcset);
        $attrs['sizes'] = $o['sizes'] ?? '100vw';
    }
    if ($defer) {
        $attrs['data-src'] = $attrs['src'];
        // 1x1 transparent GIF placeholder keeps the box and avoids a broken-image icon
        $attrs['src'] = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    }
    if (!empty($o['class'])) {
        $attrs['class'] = $o['class'];
    }
    foreach ((array) ($o['attrs'] ?? []) as $ak => $av) {
        $attrs[$ak] = $av;
    }
    if (!empty($o['priority'])) {
        $attrs['fetchpriority'] = 'high';
        $attrs['decoding'] = 'async';
    } else {
        $attrs['loading'] = $o['loading'] ?? 'lazy';
        $attrs['decoding'] = 'async';
    }

    $html = '<img';
    foreach ($attrs as $k => $v) {
        $html .= ' ' . $k . '="' . e($v) . '"';
    }
    return $html . '>';
}

/** Public URL of the full-size converted image (for og:image etc.). */
function img_url(string $key): string
{
    return url('assets/images/wp/' . $key . '.webp');
}

/* ------------------------------------------------------------------ SEO / JSON-LD */

function json_ld(array $data): string
{
    return '<script type="application/ld+json">' .
        json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP) .
        '</script>';
}

function organization_schema(): array
{
    $s = site();
    return [
        '@context' => 'https://schema.org',
        '@type'    => 'ProfessionalService',
        '@id'      => prod_url('#organization'),
        'name'     => $s['name'],
        'alternateName' => $s['full_name'],
        'url'      => prod_url(),
        'logo'     => prod_url('wp-content/uploads/2022/09/cropped-cropped-cropped-cropped-Picsart_22-09-30_11-01-38-827-1.png'),
        'image'    => prod_url('wp-content/uploads/2026/03/WhatsApp-Image-2025-09-09-at-14.05.26-2-scaled.jpeg'),
        'telephone' => $s['phone'],
        'email'    => $s['email'],
        'foundingDate' => '2022',
        'address'  => [
            '@type' => 'PostalAddress',
            'streetAddress' => $s['address_parts']['street'],
            'addressLocality' => $s['address_parts']['locality'],
            'addressRegion' => $s['address_parts']['region'],
            'addressCountry' => $s['address_parts']['country'],
        ],
        'sameAs'   => array_column($s['social'], 'href'),
    ];
}

function breadcrumb_schema(array $crumbs): array
{
    $items = [];
    foreach (array_values($crumbs) as $i => $c) {
        $items[] = ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $c[0], 'item' => prod_page_url($c[1], current_lang())];
    }
    return ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => $items];
}

/* ------------------------------------------------------------------ rendering */

/** Render a page template inside the shared layout. $page holds SEO + layout metadata. */
function render_page(string $template, array $page): void
{
    $page += [
        'key'         => '',
        'path'        => '',
        'title'       => cfg('site_name'),
        'description' => '',
        'og_image'    => null,
        'og_type'     => 'article',
        'schema'      => [],
        'robots'      => null,
        'body_class'  => '',
        'assets'      => ['css' => [], 'js' => []],
    ];
    $GLOBALS['page'] = $page;
    require INC . '/header.php';
    require ROOT . '/pages/' . $template . '.php';
    require INC . '/footer.php';
}

function nav_is_active(array $item, string $current): bool
{
    if (($item['key'] ?? '') === $current) {
        return true;
    }
    foreach ($item['children'] ?? [] as $child) {
        if ($child['key'] === $current) {
            return true;
        }
    }
    return false;
}

/** Small inline hexagon marker used as the recurring brand shape. */
function hex_icon(string $class = 'hex'): string
{
    return '<span class="' . e($class) . '" aria-hidden="true"></span>';
}

/** Breadcrumb trail ($crumbs = [[label, path], ...]); the last item is the current page. */
function render_breadcrumb(array $crumbs): void
{
    $last = count($crumbs) - 1;
    echo '<nav class="breadcrumb" aria-label="' . e(t('a11y.breadcrumb')) . '"><ol>';
    foreach ($crumbs as $i => $c) {
        if ($i === $last) {
            echo '<li aria-current="page">' . e($c[0]) . '</li>';
        } else {
            echo '<li><a href="' . e(url($c[1])) . '">' . e($c[0]) . '</a></li>';
        }
    }
    echo '</ol></nav>';
}

/** Standard inner-page hero with background image, breadcrumb and h1. */
function render_page_hero(string $title, ?string $bgKey, array $crumbs, string $lead = ''): void
{
    echo '<section class="page-hero" aria-labelledby="page-title">';
    if ($bgKey) {
        echo '<div class="page-hero-bg">' . img($bgKey, '', ['priority' => true, 'sizes' => '100vw', 'attrs' => ['data-parallax' => '0.08']]) . '</div>';
    }
    echo '<div class="page-hero-deco" aria-hidden="true"><i></i><i></i><i></i></div>';
    echo '<div class="wrap">';
    render_breadcrumb($crumbs);
    echo '<h1 id="page-title" data-split="load">' . e($title) . '</h1>';
    if ($lead !== '') {
        echo '<p class="page-lead">' . e($lead) . '</p>';
    }
    echo '</div></section>';
}

/* ------------------------------------------------------------------ CSS bundling */

/**
 * Concatenate + minify several stylesheets into ONE cached file (assets/dist/<hash>.css) so a page needs a single
 * render-blocking request. The file is rebuilt automatically when any source changes. Relative url() references are
 * rewritten for the new location. Returns the public URL, or null when the dist folder is not writable
 * (callers then fall back to the individual <link> tags).
 *
 * @param string[] $files paths relative to /assets
 */
function css_bundle(array $files): ?string
{
    $dir = ROOT . '/assets/dist';
    $sig = '';
    foreach ($files as $f) {
        $p = ROOT . '/assets/' . $f;
        if (!is_file($p)) {
            return null;
        }
        $sig .= $f . filemtime($p) . filesize($p);
    }
    $name = substr(md5($sig), 0, 12) . '.css';
    $out = $dir . '/' . $name;

    if (!is_file($out)) {
        if ((!is_dir($dir) && !@mkdir($dir, 0755, true)) || !is_writable($dir)) {
            return null;
        }
        $css = '';
        foreach ($files as $f) {
            $src = file_get_contents(ROOT . '/assets/' . $f);
            $from = dirname($f); // e.g. "fonts" or "css"
            // url(foo.woff2) in assets/<from>/ becomes url(../<from>/foo.woff2) in assets/dist/
            $src = preg_replace_callback('/url\(\s*([\'"]?)([^\'")]+)\1\s*\)/', static function ($m) use ($from) {
                $u = $m[2];
                if (preg_match('~^(data:|https?:|//|/|#)~', $u)) {
                    return $m[0];
                }
                return 'url(' . $m[1] . '../' . $from . '/' . $u . $m[1] . ')';
            }, $src);
            $css .= "\n" . $src;
        }
        // Light minification: comments, whitespace around punctuation, last semicolons
        $css = preg_replace('#/\*.*?\*/#s', '', $css);
        $css = preg_replace('/\s+/', ' ', $css);
        $css = preg_replace('/\s*([{};,>])\s*/', '$1', $css);
        $css = preg_replace('/;}/', '}', $css);
        $css = str_replace(': ', ':', $css);
        if (@file_put_contents($out, trim($css), LOCK_EX) === false) {
            return null;
        }
        // keep the folder tidy: drop bundles older than the current one
        foreach (glob($dir . '/*.css') ?: [] as $old) {
            if ($old !== $out && filemtime($old) < time() - 3600) {
                @unlink($old);
            }
        }
    }
    return url('assets/dist/' . $name);
}

/** Attributes for <link rel="preload" as="image"> that mirror img() so the LCP photo starts downloading immediately. */
function img_preload_tag(string $key, string $sizes = '100vw'): string
{
    $m = image_manifest();
    if (!isset($m[$key])) {
        return '';
    }
    [$w, , $variants] = $m[$key];
    $dir = url('assets/images/wp/');
    $set = [];
    foreach ($variants as $vw) {
        $set[] = $dir . $key . '-' . $vw . '.webp ' . $vw . 'w';
    }
    $set[] = $dir . $key . '.webp ' . $w . 'w';
    return '<link rel="preload" as="image" href="' . e($dir . $key . '.webp') . '" imagesrcset="' . e(implode(', ', $set)) . '" imagesizes="' . e($sizes) . '" fetchpriority="high">';
}

/* ------------------------------------------------------------------ rich-section helpers */

/** Verified company data (includes/data/company.php), loaded once. */
function company(): array
{
    return data('company');
}

function arrow_icon(string $class = 'arr'): string
{
    return '<svg class="' . e($class) . '" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

/** Line icons for the system explorer (48x48, stroke = currentColor). */
function node_icon(string $name): string
{
    $paths = [
        'panel'    => '<path d="M14 10h28l-6 22H8z"/><path d="M11 21h28M23.3 10l-6 22M32.7 10l-6 22M24 32v9M17 41h14"/>',
        'inverter' => '<rect x="7" y="9" width="34" height="30" rx="5"/><path d="M13 22c3-8 6-8 9 0s6 8 9 0M14 32h6M28 32h6"/>',
        'battery'  => '<rect x="5" y="14" width="33" height="21" rx="4"/><path d="M42 21v7M13 20v9M21 20v9M29 20v9"/>',
        'dist'     => '<rect x="9" y="6" width="30" height="36" rx="3"/><path d="M15 14h8M15 22h8M15 30h8M29 14h4M29 22h4M29 30h4M24 38h0"/>',
        'load'     => '<path d="M5 41V22l10 6V22l10 6V22l10 6V9h8v32z"/><path d="M11 36h4M21 36h4M31 36h4"/>',
        'grid'     => '<path d="M24 5L14 42M24 5l10 37M17 21h14M13 33h22M24 5v7M10 14h28"/>',
        'monitor'  => '<rect x="5" y="8" width="38" height="26" rx="3"/><path d="M12 27l7-8 6 5 9-11M18 41h12M24 34v7"/>',
    ];
    return '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . ($paths[$name] ?? '') . '</svg>';
}

/** [src, srcset, width, height] of a managed image, for scripts that swap pictures at runtime. */
function img_parts(string $key): ?array
{
    $m = image_manifest();
    if (!isset($m[$key])) {
        return null;
    }
    [$w, $h, $variants] = $m[$key];
    $dir = url('assets/images/wp/');
    $set = [];
    foreach ($variants as $vw) {
        $set[] = $dir . $key . '-' . $vw . '.webp ' . $vw . 'w';
    }
    $set[] = $dir . $key . '.webp ' . $w . 'w';
    return [$dir . $key . '.webp', implode(', ', $set), $w, $h];
}
