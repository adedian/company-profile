<?php
/**
 * Interactive PLTS system diagram (educational, not an engineering simulator).
 * Data: includes/data/company.php (systems + components, taken from the Company Profile "Our Systems").
 * Behaviour: assets/js/solar-ui.js (initExplorer).
 */
$c = company();
$systems = $c['systems'];
$subs = [];
foreach (['panel', 'inverter', 'battery', 'dist', 'load', 'grid', 'monitor'] as $sn) { $subs[$sn] = t('explorer.sub.' . $sn); }
$order = ['panel', 'inverter', 'dist', 'load', 'monitor', 'battery', 'grid'];
$cfg = ['systems' => [], 'components' => []];
foreach ($systems as $k => $sy) {
    $cfg['systems'][$k] = ['nodes' => $sy['nodes'], 'outage' => $sy['outage'], 'tag' => $sy['tag']];
}
foreach ($c['components'] as $k => [$t, $d]) {
    $cfg['components'][$k] = [$t, $d];
}
?>
<div class="exp" data-explorer>
    <div class="exp-top">
        <div class="exp-tabs" role="tablist" aria-label="<?= e(t('explorer.tabs_label')) ?>">
            <?php $i = 0; foreach ($systems as $k => $sy): ?>
                <button class="exp-tab" type="button" role="tab" id="exp-tab-<?= e($k) ?>" data-system="<?= e($k) ?>" aria-selected="<?= $i === 0 ? 'true' : 'false' ?>" tabindex="<?= $i === 0 ? '0' : '-1' ?>"><?= e($sy['label']) ?></button>
            <?php $i++; endforeach; ?>
        </div>
        <button class="exp-outage" type="button" aria-pressed="false" data-outage><i aria-hidden="true"></i> <?= e(t('explorer.outage_btn')) ?></button>
    </div>
    <p class="exp-sub" data-exp-tag><?= e($systems['ongrid']['tag']) ?></p>

    <div class="exp-board" data-board>
        <svg class="exp-lines" data-lines aria-hidden="true" focusable="false"></svg>
        <?php foreach ($order as $n): $comp = $c['components'][$n]; ?>
            <button class="exp-node" type="button" data-node="<?= e($n) ?>">
                <?= node_icon($n) ?>
                <b><?= e($comp[0]) ?></b>
                <small><?= e($subs[$n]) ?></small>
            </button>
        <?php endforeach; ?>
        <div class="exp-info" data-info aria-live="polite">
            <h3 data-info-title><?= e($c['components']['panel'][0]) ?></h3>
            <p data-info-text><?= e($c['components']['panel'][1]) ?></p>
            <span class="exp-status" data-status><?= e(t('explorer.status_ok')) ?></span>
        </div>
    </div>

    <?php $i = 0; foreach ($systems as $k => $sy): ?>
        <dl class="exp-specs" data-spec="<?= e($k) ?>"<?= $i === 0 ? '' : ' hidden' ?>>
            <div class="exp-spec"><dt><?= e(t('explorer.spec.source')) ?></dt><dd><?= e($sy['source']) ?></dd></div>
            <div class="exp-spec"><dt><?= e(t('explorer.spec.battery')) ?></dt><dd><?= e($sy['battery']) ?></dd></div>
            <div class="exp-spec"><dt><?= e(t('explorer.spec.outage')) ?></dt><dd><?= e($sy['outage']) ?></dd></div>
            <div class="exp-spec"><dt><?= e(t('explorer.spec.fit')) ?></dt><dd><?= e($sy['fit']) ?></dd></div>
        </dl>
    <?php $i++; endforeach; ?>
    <p class="exp-note"><?= e(t('explorer.note')) ?></p>
    <script type="application/json" data-exp-json><?= json_encode($cfg, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
</div>
