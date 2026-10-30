<?php
/** Two marquees: clients and component brands (logos from the official Company Profile). */
$c = company();
$logosShow = $logosShow ?? ['clients', 'brands'];
$row = static function (array $list, bool $dup): string {
    $out = '<div class="logo-row"' . ($dup ? ' aria-hidden="true"' : '') . '>';
    foreach ($list as [$key, $alt]) {
        $out .= '<div class="logo-chip">' . img($key, $dup ? '' : $alt, ['sizes' => '140px']) . '</div>';
    }
    return $out . '</div>';
};
?>
<div class="logos" aria-label="<?= e(t('logos.label')) ?>">
    <?php if (in_array('clients', $logosShow, true)): ?>
    <p class="logos-label"><?= e(t('logos.clients')) ?></p>
    <div class="marquee" style="--marquee-t: 48s"><div class="marquee-track"><?= $row($c['clients'], false) . $row($c['clients'], true) ?></div></div>
    <?php endif; if (in_array('brands', $logosShow, true)): ?>
    <p class="logos-label"><?= e(t('logos.brands')) ?></p>
    <div class="marquee marquee--rev" style="--marquee-t: 56s"><div class="marquee-track"><?= $row($c['brands'], false) . $row($c['brands'], true) ?></div></div>
    <?php endif; ?>
</div>
