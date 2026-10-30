<?php
/** Ticker + verified company highlights (counters). Data: includes/data/company.php */
$c = company();
?>
<section class="hl" aria-label="<?= e(t('highlights.label')) ?>">
    <div class="marquee hl-ticker" aria-hidden="true">
        <div class="marquee-track">
            <?php for ($k = 0; $k < 2; $k++): ?>
                <ul><?php foreach ($c['ticker'] as $t): ?><li><?= e($t) ?></li><?php endforeach; ?></ul>
            <?php endfor; ?>
        </div>
    </div>
    <div class="wrap hl-grid" data-stagger>
        <?php foreach ($c["highlights"] as $it): ?>
            <div class="hl-item reveal-up stagger-item">
                <b class="hl-num" data-count="<?= (int) $it['value'] ?>"<?= isset($it['fmt']) ? ' data-fmt="raw"' : '' ?><?= isset($it['suffix']) ? ' data-suffix="' . e($it['suffix']) . '"' : '' ?><?= isset($it['prefix']) ? ' data-prefix="' . e($it['prefix']) . '"' : '' ?>><?= e(($it['prefix'] ?? '') . $it['value'] . ($it['suffix'] ?? '')) ?></b>
                <span class="hl-label"><?= e($it['label']) ?></span>
                <small class="hl-note"><?= e($it['note']) ?></small>
            </div>
        <?php endforeach; ?>
    </div>
</section>
