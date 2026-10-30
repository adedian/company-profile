<?php
header('Content-Type: application/xml; charset=utf-8');
$pages = require INC . '/data/pages.php';   // structure only: routes + templates are the same in every language
$mtime = static function (string $tpl): string {
    $f = ROOT . '/pages/' . $tpl . '.php';
    return date('c', is_file($f) ? filemtime($f) : time());
};
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";
foreach ($pages as $route => $def) {
    $priority = $route === '' ? '1.0' : ($route === 'contact' ? '0.9' : '0.7');
    $path = $def['meta']['path'];
    // one <url> per language version, each listing all its alternates (including itself)
    foreach (LANGUAGES as $code => $_) {
        echo '  <url><loc>' . e(prod_page_url($path, $code)) . '</loc><lastmod>' . $mtime($def['template']) . '</lastmod><priority>' . $priority . "</priority>\n";
        foreach (LANGUAGES as $alt => $__) {
            echo '    <xhtml:link rel="alternate" hreflang="' . e($alt) . '" href="' . e(prod_page_url($path, $alt)) . '"/>' . "\n";
        }
        echo '    <xhtml:link rel="alternate" hreflang="x-default" href="' . e(prod_page_url($path, DEFAULT_LANG)) . '"/>' . "\n";
        echo "  </url>\n";
    }
}
echo "</urlset>\n";
