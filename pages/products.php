<?php
$crumbs = $GLOBALS['page']['crumbs'];
$co = company();
$sel = $co['selector'];
$items = [
    [t('products.benefit.1.title'), t('products.benefit.1.text'),
        '<path d="M3 11l9-8 9 8M5 10v10h14V10M12 14v3m-2-1.5h4" />'],
    [t('products.benefit.2.title'), t('products.benefit.2.text'),
        '<path d="M3 17l6-6 4 4 8-8M15 7h6v6" />'],
    [t('products.benefit.3.title'), t('products.benefit.3.text'),
        '<path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 12-4 16-9 16zM4 21c2-5 6-8 10-10" />'],
    [t('products.benefit.4.title'), t('products.benefit.4.text'),
        '<path d="M4 21V9l8-6 8 6v12M9 21v-6h6v6M12 9v.01" />'],
];
$rows = [
    ['residential', '01', 'hme-res-1'],
    ['commercial',  '02', 'hme-boncafe'],
    ['industrial',  '03', 'hme-mitra-saruta'],
];
?>

<section class="page-hero page-hero--tall" aria-labelledby="page-title">
    <div class="page-hero-bg"><?= img('01_hybrid-close-up', '', ['priority' => true, 'sizes' => '100vw', 'attrs' => ['data-parallax' => '0.08']]) ?></div>
    <div class="page-hero-deco" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="wrap">
        <?php render_breadcrumb($crumbs); ?>
        <p class="eyebrow eyebrow--light"><?= e(t('products.eyebrow')) ?></p>
        <h1 id="page-title" data-split="load"><?= e(t('products.h1')) ?></h1>
        <p class="hero-sub"><?= e(t('products.hero_sub')) ?></p>
        <p class="page-lead"><?= e(t('products.hero_lead_1')) ?><br><?= e(t('products.hero_lead_2')) ?></p>
        <div class="hero-cta"><a class="btn btn-amber" href="<?= e(url('contact/')) ?>" data-magnetic><?= e(t('products.contact_cta')) ?> <?= arrow_icon() ?></a></div>
        <div class="page-hero-chips" aria-label="<?= e(t('products.jump')) ?>">
            <a href="#residential"><?= e(t('sim.cat.residential')) ?></a><a href="#commercial"><?= e(t('sim.cat.commercial')) ?></a><a href="#industrial"><?= e(t('sim.cat.industrial')) ?></a><a href="#sistem">On-Grid · Off-Grid · Hybrid</a><a href="#layanan"><?= e(t('products.chip_services')) ?></a>
        </div>
    </div>
</section>

<!-- ======================= three categories: alternating editorial rows ======================= -->
<section class="section sheet sheet--light" aria-label="<?= e(t('products.categories')) ?>">
    <div class="wrap">
        <?php foreach ($rows as [$k, $no, $imgKey]): $sol = $sel[$k]; ?>
            <article class="cat-row" id="<?= e($k) ?>">
                <figure class="cat-fig reveal-mask"><?= img($sol['image'], $sol['alt'], ['sizes' => '(min-width: 900px) 48vw, 94vw']) ?></figure>
                <div class="cat-copy">
                    <p class="cat-no reveal-up"><?= e($no) ?> &mdash; <?= e($sol['label']) ?></p>
                    <h2 data-split><?= e($sol['title']) ?></h2>
                    <p class="reveal-up"><?= e($sol['text']) ?></p>
                    <?php if ($k !== 'residential'): ?>
                        <ul class="ticks reveal-up"><?php foreach ($sol['points'] as $pt): ?><li><?= e($pt) ?></li><?php endforeach; ?></ul>
                    <?php endif; ?>
                    <?php if ($sol['examples']): ?>
                        <div class="sel-eg reveal-up">
                            <p class="sel-eg-t"><?= e(t('home.selector.examples')) ?></p>
                            <ul><?php foreach ($sol['examples'] as [$nm, $cap]): ?><li class="pill"><?= e($nm) ?> <b><?= e($cap) ?></b></li><?php endforeach; ?></ul>
                        </div>
                    <?php endif; ?>
                    <p class="reveal-up"><a class="btn btn-amber" href="<?= e(url($k === 'residential' ? 'contact/?topik=residential' : $sol['cta'][1])) ?>" data-magnetic><?= $k === 'residential' ? e(t('products.residential_cta')) : e($sol['cta'][0]) ?> <?= arrow_icon() ?></a></p>
                </div>
            </article>
        <?php endforeach; ?>
    </div>
</section>

<!-- ======================= original benefit cards ======================= -->
<section class="section sheet sheet--white" aria-label="<?= e(t('products.benefits_label')) ?>">
    <div class="wrap">
        <div class="card-grid card-grid--4" data-stagger>
            <?php foreach ($items as [$title, $text, $icon]): ?>
                <article class="card benefit reveal-scale stagger-item">
                    <div class="benefit-icon benefit-icon--svg">
                        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><?= $icon ?></svg>
                    </div>
                    <h2><?= e($title) ?></h2>
                    <p><?= e($text) ?></p>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- ======================= systems ======================= -->
<section class="section sheet sheet--light" id="sistem" aria-labelledby="system-title">
    <div class="wrap">
        <div class="section-head section-head--split reveal-up">
            <div style="display:grid;gap:14px">
                <p class="eyebrow"><?= e(t('home.system.eyebrow')) ?></p>
                <h2 id="system-title" data-split><?= e(t('products.system.heading')) ?></h2>
            </div>
            <p class="lead"><?= e(t('products.system.lead')) ?></p>
        </div>
        <?php require INC . '/components/system-explorer.php'; ?>
    </div>
</section>

<!-- ======================= services + financing schemes ======================= -->
<section class="section sheet sheet--white" id="layanan" aria-labelledby="services-title">
    <div class="wrap">
        <div class="section-head reveal-up">
            <p class="eyebrow"><?= e(t('services.eyebrow')) ?></p>
            <h2 id="services-title" data-split><?= e(t('services.heading')) ?></h2>
        </div>
        <ul class="svc" data-stagger>
            <?php foreach ($co['services'] as $sv): ?>
                <li class="reveal-up stagger-item">
                    <a class="svc-row" href="<?= e(url('contact/')) ?>">
                        <span class="svc-code" aria-hidden="true"><?= e($sv['code']) ?></span>
                        <h3><?= e($sv['title']) ?></h3>
                        <p><?= e($sv['text']) ?></p>
                        <span class="svc-go" aria-hidden="true"><?= arrow_icon() ?></span>
                    </a>
                </li>
            <?php endforeach; ?>
        </ul>

        <div class="section-head" id="skema" style="margin-top: clamp(56px, 8vw, 100px)">
            <p class="eyebrow reveal-up"><?= e(t('products.schemes.eyebrow')) ?></p>
            <h2 data-split><?= e(t('products.schemes.heading')) ?></h2>
        </div>
        <div class="scheme-grid" data-stagger>
            <?php foreach ($co['schemes'] as $sc): ?>
                <article class="scheme reveal-up stagger-item">
                    <h3><?= e($sc['title']) ?></h3>
                    <p class="lead-s"><?= e($sc['lead']) ?></p>
                    <p><?= e($sc['text']) ?></p>
                    <h4><?= e(t('products.schemes.pros')) ?></h4>
                    <ul class="ticks"><?php foreach ($sc['pros'] as $x): ?><li><?= e($x) ?></li><?php endforeach; ?></ul>
                    <h4><?= e(t('products.schemes.cons')) ?></h4>
                    <ul class="ticks cons"><?php foreach ($sc['cons'] as $x): ?><li><?= e($x) ?></li><?php endforeach; ?></ul>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- ======================= advantages + brands ======================= -->
<section class="section sheet sheet--navy" aria-labelledby="benefit-title">
    <div class="wrap">
        <div class="section-head reveal-up">
            <p class="eyebrow eyebrow--light"><?= e(t('products.benefit.eyebrow')) ?></p>
            <h2 id="benefit-title" data-split><?= e(t('products.benefit.heading')) ?></h2>
        </div>
        <div class="benefit-strip" data-stagger>
            <?php foreach ($co['benefits'] as [$t, $d]): ?>
                <div class="reveal-up stagger-item"><h3><?= e($t) ?></h3><p><?= e($d) ?></p></div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<section class="section sheet sheet--light" aria-labelledby="brand-title" style="padding-bottom: clamp(56px, 8vw, 96px)">
    <div class="wrap">
        <div class="section-head reveal-up">
            <p class="eyebrow"><?= e(t('products.brand.eyebrow')) ?></p>
            <h2 id="brand-title" data-split><?= e(t('products.brand.heading')) ?></h2>
        </div>
    </div>
    <?php $logosShow = ['brands']; require INC . '/components/logos.php'; ?>
</section>

<?php $cta = ['heading' => data('home')['cta']['heading'], 'image' => 'hme-hero-roof', 'button' => data('home')['cta']['button']]; require INC . '/components/cta-visual.php'; ?>
