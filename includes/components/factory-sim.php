<?php
/**
 * Opening: scroll-driven photographic "flight" into real HME factory rooftop solar projects.
 * Data: includes/data/factory-sim.php   Styles: assets/css/factory-sim.css   Behaviour: assets/js/factory-sim.js
 *
 * All imagery is real (project photographs + a real monitoring screenshot). Scrolling moves the visitor through
 * the frames: each one dollies forward slowly and dissolves into the next. JS only writes CSS custom properties
 * (--i on the stage; --a and --s on each frame); the motion itself is CSS transform/opacity.
 * Without JS (or with reduced motion) the first photo is shown and all chapters are listed below it.
 */
$t = data('hero-tour');       // headline / CTAs shared with the photo tour
$d = data('factory-sim');
$frames = $d['frames'];
$total = count($frames);
$engineUrls = [];
foreach ((array) $d['engine'] as $ef) { if (is_file(ROOT . '/assets/' . $ef)) { $engineUrls[] = asset($ef); } }
$has3d = count($engineUrls) === count((array) $d['engine']);
?>
<section class="sim" id="sim" aria-label="<?= e(t('sim.label')) ?>" data-sim
    <?php if ($has3d): ?>data-engine="<?= e(implode(',', $engineUrls)) ?>" data-logo="<?= e(asset($d['logo'])) ?>" data-callouts="<?= e(json_encode(array_values(t_group('sim.callout.')), JSON_UNESCAPED_UNICODE)) ?>"<?php endif; ?>
    style="--sim-vh-desktop: <?= (int) $d['length_desktop'] ?>vh; --sim-vh-mobile: <?= (int) $d['length_mobile'] ?>vh">
    <div class="sim-stage" data-stage>
        <div class="sim-frames" aria-hidden="true">
            <?php foreach ($frames as $i => $f): ?>
                <?php /* project photos are intentionally not rendered in the opening: only the 3D animation is shown */ ?>
                <figure class="sim-frame sim-frame--<?= e($f['kind']) ?>" data-frame></figure>
            <?php endforeach; ?>
        </div>
        <?php if ($has3d): ?><canvas class="sim-3d" data-canvas aria-hidden="true"></canvas><?php endif; ?>
        <div class="sim-shade" aria-hidden="true"></div>

        <!-- opening copy: fades away as the visitor starts to scroll -->
        <div class="sim-intro" data-intro>
            <div class="wrap sim-intro-in">
                <p class="tour-eyebrow"><?= e($t['eyebrow']) ?></p>
                <h1 class="tour-title">
                    <?php foreach ($t['headline'] as $line_): ?><span class="tour-line"><span><?= e($line_) ?></span></span><?php endforeach; ?>
                </h1>
                <p class="tour-sub"><?= e($t['sub']) ?></p>
                <div class="tour-cta">
                    <a class="btn btn-amber btn-lg" href="<?= e(url($t['cta_primary']['path'])) ?>"><?= e($t['cta_primary']['label']) ?></a>
                    <a class="btn btn-ghost btn-lg" href="<?= e(url($t['cta_secondary']['path'])) ?>"><?= e($t['cta_secondary']['label']) ?></a>
                </div>
                <ul class="sim-cats" aria-label="<?= e(t('sim.cats_label')) ?>">
                    <li><a href="<?= e(url('products/#residential')) ?>"><?= e(t('sim.cat.residential')) ?></a></li>
                    <li><a href="<?= e(url('products/#commercial')) ?>"><?= e(t('sim.cat.commercial')) ?></a></li>
                    <li><a href="<?= e(url('products/#industrial')) ?>"><?= e(t('sim.cat.industrial')) ?></a></li>
                </ul>
            </div>
        </div>

        <!-- chapter captions -->
        <div class="sim-chapters" data-chapters>
            <?php foreach ($frames as $i => $f): ?>
                <article class="sim-chapter<?= $i === 0 ? ' is-on' : '' ?>" data-chapter="<?= $i ?>">
                    <p class="sim-count"><b><?= sprintf('%02d', $i + 1) ?></b> / <?= sprintf('%02d', $total) ?> &middot; <?= e($f['label']) ?></p>
                    <h2 class="sim-title"><?= e($f['title']) ?></h2>
                    <p class="sim-text"><?= e($f['text']) ?></p>
                    <?php if (!empty($f['note'])): ?><p class="sim-note"><?= e($f['note']) ?></p><?php endif; ?>
                </article>
            <?php endforeach; ?>
        </div>

        <!-- detail card: opened by pressing a pressable 3D callout (see data-key on .pi-c) -->
        <?php foreach ((array) ($d['info'] ?? []) as $key => $in): ?>
        <aside class="sim-info" data-info="<?= e($key) ?>" hidden aria-label="<?= e($in['label']) ?>">
            <button type="button" class="sim-info-x" data-info-close aria-label="<?= e(t('common.close')) ?>">&times;</button>
            <p class="sim-count"><?= e($in['label']) ?></p>
            <h3 class="sim-title"><?= e($in['title']) ?></h3>
            <p class="sim-text"><?= e($in['text']) ?></p>
            <button type="button" class="btn btn-amber" data-info-cta data-on="<?= e($in['cta']) ?>" data-off="<?= e($in['cta_off']) ?>"><?= e($in['cta']) ?></button>
        </aside>
        <?php endforeach; ?>

        <!-- progress rail -->
        <ol class="sim-rail" aria-label="<?= e(t('sim.rail')) ?>">
            <?php foreach ($frames as $i => $f): ?>
                <li<?= $i === 0 ? ' class="is-on"' : '' ?>>
                    <button type="button" data-goto="<?= $i ?>" aria-label="<?= e(t('sim.chapter_label', ['n' => $i + 1, 'total' => $total, 'label' => $f['label']])) ?>"<?= $i === 0 ? ' aria-current="true"' : '' ?>><span></span></button>
                </li>
            <?php endforeach; ?>
        </ol>

        <p class="sim-source" data-source data-photo="<?= e($d['source_photo']) ?>" data-3d="<?= e($d['source_3d']) ?>"><?= e($d['source_photo']) ?></p>

        <a class="sim-skip" href="#about" data-skip><?= e(t('sim.skip')) ?> <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>

        <a class="sim-cue" href="#about" aria-label="<?= e($t['scroll_label']) ?>">
            <span><?= e($t['scroll_label']) ?></span>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5v14M5 13l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
    </div>
</section>
