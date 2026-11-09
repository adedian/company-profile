<?php
/**
 * Portfolio: filterable grid of completed projects (data: includes/data/portfolio.php, filter logic: assets/js/solar-ui.js).
 */
$projects = data('portfolio');
render_page_hero(t('portfolio.title'), 'hme-aerial-white', $GLOBALS['page']['crumbs'], t('portfolio.lead'));

$cats = ['ci' => t('portfolio.cat.ci'), 'res' => t('portfolio.cat.res')];
$count = ['all' => count($projects)];
foreach ($projects as $p) { $count[$p['cat']] = ($count[$p['cat']] ?? 0) + 1; }

?>

<section class="section sheet sheet--light" aria-labelledby="pj-title" style="padding-top: calc(var(--section-y) * .8)">
    <div class="wrap">
        <header class="pj-head">
            <div>
                <p class="eyebrow reveal-up"><?= e(t('portfolio.eyebrow')) ?></p>
                <h2 id="pj-title" data-split><?= e(t('portfolio.heading')) ?></h2>
            </div>
            <p class="post-count" aria-live="polite" data-pj-count><?= e(t('portfolio.count', ['n' => count($projects)])) ?></p>
        </header>

        <div class="pj-filters reveal-up" role="group" aria-label="<?= e(t('portfolio.filter_label')) ?>" data-pj-filters>
            <button class="pj-chip" type="button" data-filter="all" aria-pressed="true"><?= e(t('portfolio.cat.all')) ?> <span><?= (int) $count['all'] ?></span></button>
            <?php foreach ($cats as $k => $label): ?>
                <button class="pj-chip" type="button" data-filter="<?= e($k) ?>" aria-pressed="false"><?= e($label) ?> <span><?= (int) ($count[$k] ?? 0) ?></span></button>
            <?php endforeach; ?>
        </div>

        <div class="pj-grid" data-stagger>
            <?php foreach ($projects as $i => $p) { require INC . '/components/project-card.php'; } ?>
        </div>
        <p class="post-empty" data-pj-empty hidden><?= e(t('portfolio.empty')) ?></p>
    </div>
</section>

<?php $cta = ['heading' => t('portfolio.cta_heading'), 'lead' => t('portfolio.cta_lead'), 'image' => 'hme-roof-panels', 'button' => t('common.contact_us')]; require INC . '/components/cta-visual.php'; ?>
