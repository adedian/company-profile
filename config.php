<?php
/**
 * Site configuration. Keep secrets (SMTP passwords, API keys) OUT of this file;
 * put them in config.local.php (ignored by git, never web-accessible) which overrides these values.
 */
$config = [
    'production_url' => 'https://hexamultienergi.com',
    'site_name'      => 'PT Hexa Multi Energi Surabaya',

    // Form handling (quote / contact forms)
    'mail_to'        => 'info@hexamultienergi.com',
    'mail_from'      => 'no-reply@hexamultienergi.com',
    'send_mail'      => false,   // set true on production once the server can send mail (or wire SMTP in config.local.php)
    'leads_dir'      => __DIR__ . '/storage/leads',

    // Blog posts still live on the WordPress install; the listing page links to them here.
    'blog_base'      => 'https://hexamultienergi.com/',

    // Hosts treated as development (never indexed, no canonical to production for crawlers)
    'local_hosts'    => ['localhost', '127.0.0.1', '::1'],
];

if (is_file(__DIR__ . '/config.local.php')) {
    $config = array_replace($config, (array) require __DIR__ . '/config.local.php');
}

return $config;
