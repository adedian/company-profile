<?php
/**
 * Multi-language support (Indonesian = default, English under /en/).
 *
 * - The language of a request is decided by the URL: "/en/..." is English, everything else is Indonesian. That keeps
 *   both versions crawlable and lets us publish hreflang / canonical for each of them.
 * - A cookie (hme_lang) remembers the visitor's last explicit choice; it is only used to send a returning visitor from
 *   the Indonesian home page to the English home page. It never decides the language of any other URL.
 * - UI strings live in includes/translations/{id,en}.php (flat "section.key" arrays, read with t()).
 *   Content arrays (includes/data/*.php) stay the base; includes/translations/data/{id,en}/<name>.php hold the
 *   per-language text on top of them (read with data()).
 * - Only the codes listed in LANGUAGES are ever accepted; no file name is built from user input.
 */

const DEFAULT_LANG = 'id';
const LANG_COOKIE = 'hme_lang';

/** code => [name in the menu, label on the button, short code, Open Graph locale] */
const LANGUAGES = [
    'id' => ['name' => 'Bahasa Indonesia', 'label' => 'Indonesia', 'short' => 'ID', 'locale' => 'id_ID'],
    'en' => ['name' => 'English',          'label' => 'English',   'short' => 'EN', 'locale' => 'en_US'],
];

function lang_is_supported($code): bool
{
    return is_string($code) && isset(LANGUAGES[$code]);
}

function current_lang(): string
{
    return $GLOBALS['lang'] ?? DEFAULT_LANG;
}

/**
 * Split a request path (already relative to the site folder, e.g. "/en/products/") into [language, remaining path].
 * "/en" and "/en/..." are English; "/en" is the only prefix that exists besides the default language.
 */
function lang_split_path(string $path): array
{
    foreach (LANGUAGES as $code => $_) {
        if ($code === DEFAULT_LANG) {
            continue;
        }
        if ($path === '/' . $code) {
            return [$code, '/'];
        }
        if (strpos($path, '/' . $code . '/') === 0) {
            return [$code, substr($path, strlen($code) + 1)];
        }
    }
    return [DEFAULT_LANG, $path];
}

/**
 * Called once from bootstrap before any text is produced: reads the URL, fixes the language, stores the remaining
 * route and (for explicit choices) writes the preference cookie.
 */
function lang_boot(): void
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $path = rawurldecode($path);
    $base = base_path();
    if ($base !== '' && strpos($path, $base) === 0) {
        $path = substr($path, strlen($base));
    }
    if ($path === '' || $path[0] !== '/') {
        $path = '/' . $path;
    }
    [$lang, $rest] = lang_split_path($path);
    $GLOBALS['lang'] = $lang;
    $GLOBALS['lang_rest'] = $rest;
    $GLOBALS['lang_raw_path'] = $path;

    if (PHP_SAPI === 'cli') {
        return;
    }
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $saved = $_COOKIE[LANG_COOKIE] ?? null;

    // Explicit switch to the default language: /some/page/?hl=id -> remember it, then show the clean URL.
    if ($method === 'GET' && $lang === DEFAULT_LANG && isset($_GET['hl']) && lang_is_supported($_GET['hl'])) {
        $choice = (string) $_GET['hl'];
        lang_remember($choice);
        $qs = $_GET;
        unset($qs['hl']);
        header('Location: ' . lang_page_path($rest, $choice) . ($qs ? '?' . http_build_query($qs) : ''), true, 302);
        exit;
    }

    // The Indonesian home page may redirect (cookie), so caches must not share it between visitors
    if ($lang === DEFAULT_LANG && $rest === '/') {
        header('Vary: Cookie');
    }

    // Visiting an English URL is itself a choice of English.
    if ($lang !== DEFAULT_LANG && $saved !== $lang) {
        lang_remember($lang);
        $saved = $lang;
    }

    // Returning visitor who chose English opens the bare Indonesian home page -> take them to /en/.
    if ($method === 'GET' && $lang === DEFAULT_LANG && $rest === '/' && !isset($_GET['hl'])
        && lang_is_supported($saved) && $saved !== DEFAULT_LANG) {
        header('Vary: Cookie');
        header('Location: ' . lang_page_path('/', $saved), true, 302);
        exit;
    }
}

/** Store the visitor's choice for a year. Only allow-listed codes reach this function. */
function lang_remember(string $code): void
{
    if (!lang_is_supported($code) || headers_sent()) {
        return;
    }
    setcookie(LANG_COOKIE, $code, [
        'expires'  => time() + 31536000,
        'path'     => '/',
        'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => false,
        'samesite' => 'Lax',
    ]);
    $_COOKIE[LANG_COOKIE] = $code;
}

/** Site-relative URL of a language-less route ("/products/" or "products/") in the given language. */
function lang_page_path(string $route, string $lang): string
{
    $r = ltrim($route, '/');
    return base_path() . '/' . ($lang === DEFAULT_LANG ? '' : $lang . '/') . $r;
}

/** Paths that exist once, outside the language tree (static files, machine endpoints). */
function lang_is_shared_path(string $path): bool
{
    return $path === 'sitemap.xml' || $path === 'robots.txt' || strpos($path, 'assets/') === 0;
}

/** Absolute production URL of a page in a given language (canonical / hreflang / sitemap). */
function prod_page_url(string $path, string $lang): string
{
    return rtrim(cfg('production_url'), '/') . '/' . ($lang === DEFAULT_LANG ? '' : $lang . '/') . ltrim($path, '/');
}

/* ------------------------------------------------------------------ strings */

/** @return array<string,string> flat dictionary of the active language */
function lang_dictionary(string $lang): array
{
    static $cache = [];
    if (!isset($cache[$lang])) {
        $file = INC . '/translations/' . (lang_is_supported($lang) ? $lang : DEFAULT_LANG) . '.php';
        $cache[$lang] = is_file($file) ? (array) require $file : [];
    }
    return $cache[$lang];
}

/**
 * Translate a UI key. {name} placeholders are replaced from $vars. Returns the raw text (escape it with e() when it is
 * printed). A key that is missing in the active language falls back to Indonesian, then to the key itself.
 */
function t(string $key, array $vars = [], ?string $lang = null): string
{
    $dict = lang_dictionary($lang ?? current_lang());
    $text = $dict[$key] ?? lang_dictionary(DEFAULT_LANG)[$key] ?? $key;
    if ($vars) {
        $pairs = [];
        foreach ($vars as $k => $v) {
            $pairs['{' . $k . '}'] = (string) $v;
        }
        $text = strtr($text, $pairs);
    }
    return $text;
}

/** All keys of a dictionary that start with $prefix, with the prefix removed (used to hand strings to JavaScript). */
function t_group(string $prefix): array
{
    $out = [];
    foreach (lang_dictionary(current_lang()) + lang_dictionary(DEFAULT_LANG) as $k => $v) {
        if (strpos($k, $prefix) === 0) {
            $out[substr($k, strlen($prefix))] = $v;
        }
    }
    return $out;
}

/** Locale-aware number: 2,26 (id) / 2.26 (en). */
function num($value, int $decimals = 0): string
{
    return current_lang() === 'en'
        ? number_format((float) $value, $decimals, '.', ',')
        : number_format((float) $value, $decimals, ',', '.');
}

/**
 * Visible date of a blog listing entry. The listing stores WordPress' dd/mm/yyyy; Indonesian shows it in the standard
 * written form ("4 Agustus 2026"), English keeps the stored form.
 */
function post_date(string $raw): string
{
    if (current_lang() !== 'id' || !preg_match('#^(\d{1,2})/(\d{1,2})/(\d{4})$#', trim($raw), $m)) {
        return $raw;
    }
    $months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    $month = $months[(int) $m[2] - 1] ?? null;
    return $month === null ? $raw : (int) $m[1] . ' ' . $month . ' ' . $m[3];
}

/**
 * Content arrays: includes/data/<name>.php is the structure (images, numbers, ids) in the site's original wording;
 * includes/translations/data/<lang>/<name>.php overrides the text of the active language, key by key.
 */
function data(string $name): array
{
    static $cache = [];
    $lang = current_lang();
    $ck = $lang . '/' . $name;
    if (!isset($cache[$ck])) {
        // files are loaded in their own scope: they define helper variables ({$name} in pages.php) that must not leak here
        $load = static function (string $file): array {
            return (array) require $file;
        };
        $base = $load(INC . '/data/' . $name . '.php');
        $overlay = INC . '/translations/data/' . $lang . '/' . $name . '.php';
        $cache[$ck] = is_file($overlay) ? array_replace_recursive($base, $load($overlay)) : $base;
    }
    return $cache[$ck];
}
