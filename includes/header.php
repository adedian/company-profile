<?php
/** @var array $page set by render_page() */
$page = $GLOBALS['page'];
$s = site();
$lang = current_lang();
$canonical = prod_page_url($page['path'], $lang);
$indexable = $page['key'] !== '404';
$robots = $page['robots'] ?? (is_local() ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
$ogImage = $page['og_image'] ?: 'https://hexamultienergi.com/wp-content/uploads/2022/09/cropped-cropped-cropped-cropped-Picsart_22-09-30_11-01-38-827-1-300x281.png';
$schemas = [];
if ($page['key'] === 'home') {
    $schemas[] = organization_schema();
}
if (!empty($page['crumbs'])) {
    $schemas[] = breadcrumb_schema($page['crumbs']);
}
foreach ((array) $page['schema'] as $extra) {
    $schemas[] = $extra;
}
?><!doctype html>
<html lang="<?= e($lang) ?>">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title><?= e($page['title']) ?></title>
    <meta name="description" content="<?= e($page['description']) ?>">
    <meta name="robots" content="<?= e($robots) ?>">
    <link rel="canonical" href="<?= e($canonical) ?>">
    <?php if ($indexable): foreach (LANGUAGES as $code => $_): ?>
    <link rel="alternate" hreflang="<?= e($code) ?>" href="<?= e(prod_page_url($page['path'], $code)) ?>">
    <?php endforeach; ?>
    <link rel="alternate" hreflang="x-default" href="<?= e(prod_page_url($page['path'], DEFAULT_LANG)) ?>">
    <?php endif; ?>
    <meta name="theme-color" content="#0a3055">

    <meta property="og:locale" content="<?= e(LANGUAGES[$lang]['locale']) ?>">
    <?php foreach (LANGUAGES as $code => $info): if ($code !== $lang): ?>
    <meta property="og:locale:alternate" content="<?= e($info['locale']) ?>">
    <?php endif; endforeach; ?>
    <meta property="og:type" content="<?= e($page['og_type']) ?>">
    <meta property="og:title" content="<?= e($page['title']) ?>">
    <meta property="og:description" content="<?= e($page['description']) ?>">
    <meta property="og:url" content="<?= e($canonical) ?>">
    <meta property="og:site_name" content="<?= e(cfg('site_name')) ?>">
    <meta property="og:image" content="<?= e($ogImage) ?>">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= e($page['title']) ?>">
    <meta name="twitter:description" content="<?= e($page['description']) ?>">
    <meta name="twitter:image" content="<?= e($ogImage) ?>">

    <link rel="icon" type="image/webp" href="<?= e(img_url('cropped-cropped-cropped-cropped-picsart_22-09-30_11-01-38-827-1')) ?>">
    <link rel="apple-touch-icon" href="<?= e(img_url('cropped-cropped-cropped-cropped-picsart_22-09-30_11-01-38-827-1')) ?>">

    <script>document.documentElement.className+=' js';</script>
    <link rel="preload" href="<?= e(url('assets/fonts/3y9K6as8bTXq_nANBjzKo3IeZx8z6up5BeSl9D4dj_x9PpZBMlGIInE.woff2')) ?>" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="<?= e(url('assets/fonts/_Xms-HUzqDCFdgfMm4S9DQ.woff2')) ?>" as="font" type="font/woff2" crossorigin>
    <?php if (!empty($page['preload_image'])): ?>
    <?= img_preload_tag($page['preload_image']) . "\n" ?>
    <?php endif; ?>
    <?php
    // One render-blocking stylesheet per page (bundled + minified, rebuilt automatically); falls back to separate files.
    $cssFiles = array_merge(['fonts/fonts.css', 'css/style.css', 'css/animations.css'], $page['assets']['css'] ?? []);
    $bundle = css_bundle($cssFiles);
    if ($bundle): ?>
    <link rel="stylesheet" href="<?= e($bundle) ?>">
    <?php else: foreach ($cssFiles as $css): ?>
    <link rel="stylesheet" href="<?= e(asset($css)) ?>">
    <?php endforeach; endif; ?>
    <?php
    // Styles for sections below the first screen load without blocking the first paint (home page only).
    if (!empty($page['assets']['css_defer'])):
        $deferred = css_bundle($page['assets']['css_defer']);
        if ($deferred): ?>
    <script>addEventListener('load',function(){var l=document.createElement('link');l.rel='stylesheet';l.href=<?= json_encode($deferred) ?>;document.head.appendChild(l)})</script>
    <noscript><link rel="stylesheet" href="<?= e($deferred) ?>"></noscript>
    <?php else: foreach ($page['assets']['css_defer'] as $css): ?>
    <link rel="stylesheet" href="<?= e(asset($css)) ?>">
    <?php endforeach; endif; endif; ?>
    <?php foreach ($schemas as $schema): ?>
    <?= json_ld($schema) . "\n" ?>
    <?php endforeach; ?>
</head>
<body class="<?= e($page['body_class']) ?>">
<a class="skip-link" href="#content"><?= e(t('a11y.skip')) ?></a>

<header class="site-header" id="site-header">
    <div class="wrap header-bar">
        <a class="brand" href="<?= e(url()) ?>" aria-label="<?= e(t('a11y.brand_home')) ?>">
            <?= img('cropped-cropped-cropped-cropped-picsart_22-09-30_11-01-38-827-1', $s['full_name'], ['priority' => true, 'width' => 46, 'height' => 43, 'class' => 'brand-logo']) ?>
            <span class="brand-text"><b>Hexa Multi Energi</b> <small>PLTS Surabaya</small></span>
        </a>

        <?php require INC . '/navigation.php'; ?>
        <?php require INC . '/components/language-switcher.php'; ?>
    </div>
    <div class="scroll-progress" aria-hidden="true"></div>
</header>

<main id="content" tabindex="-1">
