<?php
/** Primary navigation (desktop bar + mobile drawer share the same markup). */
$s = site();
$current = $GLOBALS['page']['key'] ?? '';
?>
<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="<?= e(t('nav.toggle')) ?>">
    <span class="menu-icon" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="menu-label"><?= e(t('nav.menu')) ?></span>
</button>

<nav class="primary-nav" id="primary-nav" aria-label="<?= e(t('nav.primary')) ?>">
    <ul class="nav-list">
        <?php foreach ($s['nav'] as $item):
            $active = nav_is_active($item, $current);
            $hasKids = !empty($item['children']);
            $cls = 'nav-link' . ($active ? ' is-active' : '') . (!empty($item['highlight']) ? ' nav-link--highlight' : '');
            ?>
            <li class="nav-item<?= $hasKids ? ' has-sub' : '' ?>">
                <?php if ($hasKids): ?>
                    <div class="nav-split">
                        <a class="<?= e($cls) ?>" href="<?= e(url($item['path'])) ?>"<?= $active ? ' aria-current="page"' : '' ?>><?= e($item['label']) ?></a>
                        <button class="sub-toggle" type="button" aria-expanded="false" aria-label="<?= e(t('nav.open_submenu', ['item' => $item['label']])) ?>">
                            <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                    </div>
                    <ul class="sub-list">
                        <?php foreach ($item['children'] as $child): ?>
                            <li><a href="<?= e(url($child['path'])) ?>"<?= $child['key'] === $current ? ' aria-current="page"' : '' ?>><?= e($child['label']) ?></a></li>
                        <?php endforeach; ?>
                    </ul>
                <?php else: ?>
                    <a class="<?= e($cls) ?>" href="<?= e(url($item['path'])) ?>"<?= $active ? ' aria-current="page"' : '' ?>>
                        <?php if (!empty($item['highlight'])): ?><span class="hex hex--sm" aria-hidden="true"></span><?php endif; ?>
                        <?= e($item['label']) ?>
                    </a>
                <?php endif; ?>
            </li>
        <?php endforeach; ?>
        <li class="nav-item nav-cta">
            <a class="btn btn-amber btn-sm" href="<?= e($s['whatsapp_href']) ?>" target="_blank" rel="noopener"><?= e(t('nav.whatsapp')) ?></a>
        </li>
    </ul>
</nav>
