<?php
/**
 * One project card (portfolio list and "other projects" on a project page).
 * Expects $p (project), $i (position, first cards load eagerly); optional $sizes.
 */
$sizes = $sizes ?? '(min-width: 1000px) 360px, (min-width: 640px) 45vw, 92vw';
$href = portfolio_url($p);
$date = portfolio_when($p);
$cap = portfolio_capacity($p);
$pin = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
?>
<article class="pj card reveal-up stagger-item" data-cat="<?= e($p['cat']) ?>">
    <a class="pj-thumb post-thumb" href="<?= e($href) ?>" tabindex="-1" aria-hidden="true">
        <?= img($p['image'], $p['alt'], ['sizes' => $sizes, 'loading' => ($i ?? 0) < 3 ? 'eager' : 'lazy']) ?>
        <span class="pj-badge pj-badge--<?= e($p['type']) ?>"><?= e(t('portfolio.type.' . $p['type'])) ?></span>
    </a>
    <div class="pj-body">
        <h3 class="pj-title"><a href="<?= e($href) ?>"><?= e($p['title']) ?></a></h3>
        <p class="pj-place"><?= $pin ?><span><?= e($p['place']) ?></span></p>
        <?php if ($cap !== '' || $date !== ''): ?>
            <dl class="pj-specs">
                <?php if ($cap !== ''): ?><div><dt><?= e(t('portfolio.capacity')) ?></dt><dd><?= e($cap) ?></dd></div><?php endif; ?>
                <?php if ($date !== ''): ?><div><dt><?= e(t('portfolio.date')) ?></dt><dd><?= e($date) ?></dd></div><?php endif; ?>
            </dl>
        <?php endif; ?>
        <a class="pj-more arrow-link" href="<?= e($href) ?>" aria-label="<?= e(t('portfolio.view_about', ['title' => $p['title']])) ?>"><?= e(t('portfolio.view')) ?> <?= arrow_icon() ?></a>
    </div>
</article>
