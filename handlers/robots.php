<?php
header('Content-Type: text/plain; charset=utf-8');
if (is_local()) {
    // Development copy: never index.
    echo "User-agent: *\nDisallow: /\n";
    return;
}
echo "User-agent: *\nDisallow: /kirim/\nDisallow: /en/kirim/\n\nSitemap: " . prod_url('sitemap.xml') . "\n";
