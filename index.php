<?php
declare(strict_types=1);

/**
 * Front controller. Routes keep the URLs of the live WordPress site
 * (/, /products/, /contact/, /newsblog/, /career/) and add /company-profile/.
 * English lives under the same routes with an "/en" prefix (/en/, /en/products/, ...); the prefix is split off in
 * includes/language.php before routing, so every route below works unchanged in both languages.
 */
require __DIR__ . '/includes/bootstrap.php';

// Path relative to the site folder, without the language prefix
$path = $GLOBALS['lang_rest'];
$route = trim($path, '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// "/en" -> "/en/"
if (current_lang() !== DEFAULT_LANG && ($GLOBALS['lang_raw_path'] ?? '') === '/' . current_lang()) {
    redirect(url(), 301);
}

// index.php requested directly -> canonical home
if ($route === 'index.php') {
    redirect(url(), 301);
}

/** Page routes: route => [template, page key, page meta] */
$pages = data('pages');

switch (true) {
    case $route === 'robots.txt':
        require ROOT . '/handlers/robots.php';
        break;

    case $route === 'sitemap.xml':
        require ROOT . '/handlers/sitemap.php';
        break;

    case $route === 'kirim':
        require ROOT . '/handlers/submit.php';
        break;

    case $route === 'home':
        redirect(url(), 301);
        break;

    case isset($pages[$route]):
        // Pages are served with a trailing slash (same as WordPress permalinks)
        if ($route !== '' && substr($path, -1) !== '/') {
            $qs = $_SERVER['QUERY_STRING'] ?? '';
            redirect(url($route . '/') . ($qs !== '' ? '?' . $qs : ''), 301);
        }
        $def = $pages[$route];
        render_page($def['template'], $def['meta']);
        break;

    default:
        http_response_code(404);
        render_page('404', [
            'key'    => '404',
            'title'  => t('404.title') . ' - ' . cfg('site_name'),
            'robots' => 'noindex, follow',
            'description' => t('404.description'),
        ]);
}
