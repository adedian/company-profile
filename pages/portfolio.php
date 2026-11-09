<?php
/**
 * Portfolio: filterable grid of completed projects (data: includes/data/portfolio.php, filter logic: assets/js/solar-ui.js).
 */
$projects = data('portfolio');
render_page_hero(t('portfolio.title'), 'hme-aerial-white', $GLOBALS['page']['crumbs'], t('portfolio.lead'));

$cats = ['ci' => t('portfolio.cat.ci'), 'res' => t('portfolio.cat.res')];
$count = ['all' => count($projects)];
foreach ($projects as $p) { $count[$p['cat']] = ($count[$p['cat']] ?? 0) + 1; }

$months = current_lang() === 'en'
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
$when = static fn(array $p): string => $p['year'] === null ? '' : (($p['month'] !== null ? $months[$p['month'] - 1] . ' ' : '') . $p['year']);
$capacity = static fn(array $p): string => $p['kwp'] === null ? '' : ($p['kwp'] >= 1000 ? num($p['kwp'], 0) : rtrim(rtrim(num($p['kwp'], 2), '0'), current_lang() === 'en' ? '.' : ',')) . ' kWp';

$pin = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
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
            <?php foreach ($projects as $i => $p):
                $date = $when($p);
                $cap = $capacity($p);
                ?>
                <article class="pj card reveal-up stagger-item" data-cat="<?= e($p['cat']) ?>">
                    <a class="pj-thumb post-thumb" href="<?= e($p['url']) ?>" tabindex="-1" aria-hidden="true">
                        <?= img($p['image'], $p['alt'], ['sizes' => '(min-width: 1000px) 360px, (min-width: 640px) 45vw, 92vw', 'loading' => $i < 3 ? 'eager' : 'lazy']) ?>
                        <span class="pj-badge pj-badge--<?= e($p['type']) ?>"><?= e(t('portfolio.type.' . $p['type'])) ?></span>
                    </a>
                    <div class="pj-body">
                        <h3 class="pj-title"><a href="<?= e($p['url']) ?>"><?= e($p['title']) ?></a></h3>
                        <p class="pj-place"><?= $pin ?><span><?= e($p['place']) ?></span></p>
                        <?php if ($cap !== '' || $date !== ''): ?>
                            <dl class="pj-specs">
                                <?php if ($cap !== ''): ?><div><dt><?= e(t('portfolio.capacity')) ?></dt><dd><?= e($cap) ?></dd></div><?php endif; ?>
                                <?php if ($date !== ''): ?><div><dt><?= e(t('portfolio.date')) ?></dt><dd><?= e($date) ?></dd></div><?php endif; ?>
                            </dl>
                        <?php endif; ?>
                        <a class="pj-more arrow-link" href="<?= e($p['url']) ?>" aria-label="<?= e(t('portfolio.view_about', ['title' => $p['title']])) ?>"><?= e(t('portfolio.view')) ?> <?= arrow_icon() ?></a>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
        <p class="post-empty" data-pj-empty hidden><?= e(t('portfolio.empty')) ?></p>
    </div>
</section>

<?php $cta = ['heading' => t('portfolio.cta_heading'), 'lead' => t('portfolio.cta_lead'), 'image' => 'hme-roof-panels', 'button' => t('common.contact_us')]; require INC . '/components/cta-visual.php'; ?>
