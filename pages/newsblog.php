<?php
$posts = data('posts');
render_page_hero(t('news.title'), 'pexels-los-muertos-crew-8853499', $GLOBALS['page']['crumbs'], t('news.lead'));
// The listing stores WordPress' own wording ("No Comments", "2 Comments"); show it in the active language
$commentsLabel = static function (string $raw): string {
    if (preg_match('/^(\d+)\s+Comments?$/i', trim($raw), $m)) {
        return (int) $m[1] === 1 ? t('news.comments.one') : t('news.comments.many', ['n' => $m[1]]);
    }
    return preg_match('/^No\s+Comments?$/i', trim($raw)) ? t('news.comments.none') : $raw;
};
$feat = $posts[0];
$rest = array_slice($posts, 1, null, true);
$key = static fn(array $p): string => mb_strtolower($p['title'] . ' ' . $p['excerpt']);
$searchIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
?>

<section class="section sheet sheet--light" aria-label="<?= e(t('news.list_label')) ?>" style="padding-top: calc(var(--section-y) * .8)">
    <div class="wrap">
        <div class="post-tools reveal-up">
            <label class="post-search">
                <span class="sr-only"><?= e(t('news.search_label')) ?></span>
                <?= $searchIcon ?>
                <input type="search" placeholder="<?= e(t('news.search_placeholder')) ?>" data-post-filter autocomplete="off">
            </label>
            <p class="post-count" aria-live="polite" data-post-count><?= e(t('news.count', ['n' => count($posts)])) ?></p>
        </div>

        <article class="post post-feature card reveal-up" data-title="<?= e($key($feat)) ?>">
            <?php if ($feat['image'] !== ''): ?>
                <a class="post-thumb" href="<?= e($feat['url']) ?>" tabindex="-1" aria-hidden="true"><?= img($feat['image'], $feat['alt'], ['sizes' => '(min-width: 900px) 56vw, 94vw', 'loading' => 'eager']) ?></a>
            <?php endif; ?>
            <div class="post-body">
                <span class="post-tag"><?= e(t('news.latest')) ?></span>
                <h2 class="post-title"><a href="<?= e($feat['url']) ?>"><?= e($feat['title']) ?></a></h2>
                <p class="post-excerpt"><?= e($feat['excerpt']) ?></p>
                <a class="post-more arrow-link" href="<?= e($feat['url']) ?>" aria-label="<?= e(t('news.read_more_about', ['title' => $feat['title']])) ?>"><?= e(t('news.read_more')) ?> <?= arrow_icon() ?></a>
                <p class="post-meta">
                    <time datetime="<?= e(implode('-', array_reverse(explode('/', $feat['date'])))) ?>"><?= e(post_date($feat['date'])) ?></time>
                    <?php if ($feat['author'] !== ''): ?><span><?= e($feat['author']) ?></span><?php endif; ?>
                    <span><?= e($commentsLabel($feat['comments'])) ?></span>
                </p>
            </div>
        </article>

        <div class="post-grid" data-stagger>
            <?php foreach ($rest as $i => $p): $href = $p['url']; ?>
                <article class="post card reveal-up stagger-item" data-title="<?= e($key($p)) ?>">
                    <?php if ($p['image'] !== ''): ?>
                        <a class="post-thumb" href="<?= e($href) ?>" tabindex="-1" aria-hidden="true">
                            <?= img($p['image'], $p['alt'], ['sizes' => '(min-width: 1000px) 360px, (min-width: 640px) 45vw, 92vw', 'loading' => $i < 4 ? 'eager' : 'lazy']) ?>
                        </a>
                    <?php endif; ?>
                    <div class="post-body">
                        <h2 class="post-title"><a href="<?= e($href) ?>"><?= e($p['title']) ?></a></h2>
                        <p class="post-excerpt"><?= e($p['excerpt']) ?></p>
                        <a class="post-more" href="<?= e($href) ?>" aria-label="<?= e(t('news.read_more_about', ['title' => $p['title']])) ?>"><?= e(t('news.read_more')) ?> »</a>
                        <p class="post-meta">
                            <time datetime="<?= e(implode('-', array_reverse(explode('/', $p['date'])))) ?>"><?= e(post_date($p['date'])) ?></time>
                            <?php if ($p['author'] !== ''): ?><span><?= e($p['author']) ?></span><?php endif; ?>
                            <span><?= e($commentsLabel($p['comments'])) ?></span>
                        </p>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
        <?php if (t('news.note') !== ''): ?><p class="post-note"><?= e(t('news.note')) ?></p><?php endif; ?>
        <p class="post-empty" data-post-empty hidden><?= e(t('news.empty')) ?></p>
    </div>
</section>

<?php $cta = ['heading' => t('news.cta_heading'), 'lead' => t('news.cta_lead'), 'image' => 'hme-roof-panels', 'button' => t('common.contact_us')]; require INC . '/components/cta-visual.php'; ?>
