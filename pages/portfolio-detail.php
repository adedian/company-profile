<?php
/**
 * One portfolio project (route /portfolio/<slug>/, set up in index.php; data: includes/data/portfolio.php).
 */
$p = $GLOBALS['project'];
$all = data('portfolio');
$cap = portfolio_capacity($p);
$date = portfolio_when($p);

$lead = [t('portfolio.d.lead', ['type' => mb_strtolower(t('portfolio.type.' . $p['type'])), 'place' => $p['place']])];
if ($cap !== '') { $lead[] = t('portfolio.d.lead_cap', ['cap' => $cap]); }
if ($date !== '') { $lead[] = t('portfolio.d.lead_date', ['date' => $date]); }

// the three projects that follow this one in the list (wrapping around)
$others = [];
for ($k = 1; $k <= 3; $k++) {
    $others[] = $all[($p['index'] + $k) % count($all)];
}

render_page_hero($p['title'], $p['image'], $GLOBALS['page']['crumbs'], $p['place']);
?>

<section class="section sheet sheet--light" aria-label="<?= e(t('portfolio.d.eyebrow')) ?>" style="padding-top: calc(var(--section-y) * .8)">
    <div class="wrap pjd">
        <figure class="pjd-fig reveal-mask"><?= img($p['image'], $p['alt'], ['sizes' => '(min-width: 860px) 52vw, 94vw', 'loading' => 'eager']) ?></figure>
        <div class="pjd-copy">
            <p class="eyebrow reveal-up"><?= e(t('portfolio.d.eyebrow')) ?></p>
            <p class="pjd-lead reveal-up"><?= e(implode(' ', $lead)) ?></p>
            <dl class="pjd-facts reveal-up" aria-label="<?= e(t('portfolio.d.facts')) ?>">
                <div class="wide"><dt><?= e(t('portfolio.d.location')) ?></dt><dd><?= e($p['place']) ?></dd></div>
                <div><dt><?= e(t('portfolio.d.type')) ?></dt><dd><?= e(t('portfolio.type.' . $p['type'])) ?></dd></div>
                <?php if ($cap !== ''): ?><div><dt><?= e(t('portfolio.capacity')) ?></dt><dd><?= e($cap) ?></dd></div><?php endif; ?>
                <?php if ($date !== ''): ?><div><dt><?= e(t('portfolio.date')) ?></dt><dd><?= e($date) ?></dd></div><?php endif; ?>
            </dl>
            <div class="pjd-actions reveal-up">
                <a class="btn btn-amber" href="<?= e(url('contact/')) ?>" data-magnetic><?= e(t('common.contact_us')) ?> <?= arrow_icon() ?></a>
                <a class="pjd-back" href="<?= e(url('portfolio/')) ?>"><?= arrow_icon() ?> <?= e(t('portfolio.d.back')) ?></a>
            </div>
        </div>
    </div>
</section>

<?php if (count($p['photos'] ?? []) > 1): ?>
<section class="section sheet sheet--white" aria-labelledby="pjg-title">
    <div class="wrap">
        <h2 id="pjg-title" class="center-title" data-split><?= e(t('portfolio.d.gallery')) ?></h2>
        <p class="center reveal-up" style="color: var(--color-muted); margin-top: 8px"><?= e(t('portfolio.d.gallery_lead')) ?></p>
        <ul class="pjg" data-stagger>
            <?php foreach ($p['photos'] as $n => $key): $k = $n + 1; ?>
                <li class="pjg-item reveal-scale stagger-item">
                    <button type="button" data-lightbox data-full="<?= e(img_url($key)) ?>" aria-label="<?= e(t('portfolio.d.zoom', ['n' => $k])) ?>">
                        <?= img($key, t('portfolio.d.photo_alt', ['n' => $k, 'title' => $p['title']]), ['sizes' => $n === 0 ? '(min-width: 1000px) 720px, 94vw' : '(min-width: 1000px) 360px, (min-width: 640px) 45vw, 92vw', 'loading' => $n < 3 ? 'eager' : 'lazy']) ?>
                    </button>
                </li>
            <?php endforeach; ?>
        </ul>
    </div>
</section>
<?php endif; ?>

<section class="section sheet <?= count($p['photos'] ?? []) > 1 ? 'sheet--light' : 'sheet--white' ?>" aria-labelledby="pj-others">
    <div class="wrap">
        <h2 id="pj-others" class="center-title" data-split><?= e(t('portfolio.d.others')) ?></h2>
        <div class="pj-grid" data-stagger style="margin-top: clamp(24px, 4vw, 40px)">
            <?php foreach ($others as $i => $p) { $sizes = '(min-width: 1000px) 360px, (min-width: 640px) 45vw, 92vw'; require INC . '/components/project-card.php'; } ?>
        </div>
    </div>
</section>

<?php $cta = ['heading' => t('portfolio.cta_heading'), 'lead' => t('portfolio.cta_lead'), 'image' => 'hme-roof-panels', 'button' => t('common.contact_us')]; require INC . '/components/cta-visual.php'; ?>
