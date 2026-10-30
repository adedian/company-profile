<?php
/**
 * Solar PV Tour hero. Config: includes/data/hero-tour.php. Styles: assets/css/hero-tour.css. Behaviour: assets/js/solar-tour.js.
 * Works without JavaScript (scene 1 is shown) and without video (photo tour).
 */
$t = data('hero-tour');
$scenes = $t['scenes'];
$total = count($scenes);
$dur = (float) $t['interval'];

// Optional video files (only rendered when they really exist in assets/)
$vid = [];
foreach (['desktop', 'mobile', 'webm'] as $k) {
    if (!empty($t['video'][$k]) && is_file(ROOT . '/assets/' . $t['video'][$k])) {
        $vid[$k] = asset($t['video'][$k]);
    }
}
?>
<section class="tour" id="tour" aria-label="<?= e(t('tour.label')) ?>" data-tour style="--dur: <?= e((string) $dur) ?>s">
    <div class="tour-stage" aria-hidden="true">
        <div class="tour-scenes">
            <?php foreach ($scenes as $i => $sc): ?>
                <figure class="tour-scene<?= $i === 0 ? ' is-active' : '' ?>" data-scene
                    style="--move: tour-<?= e($sc['move']) ?>; --origin: <?= e($sc['origin']) ?>; --pos-d: <?= e($sc['pos_d']) ?>; --pos-m: <?= e($sc['pos_m']) ?>">
                    <?= img($sc['image'], $sc['alt'], $i === 0
                        ? ['priority' => true, 'loading' => 'eager', 'sizes' => '100vw']
                        : ['defer' => true, 'loading' => 'eager', 'sizes' => '100vw']) ?>
                </figure>
            <?php endforeach; ?>
        </div>
        <?php if ($vid): ?>
            <video class="tour-video" data-video muted loop playsinline preload="none" tabindex="-1" disablepictureinpicture
                <?php foreach ($vid as $k => $u): ?>data-src-<?= e($k) ?>="<?= e($u) ?>" <?php endforeach; ?>></video>
        <?php endif; ?>
        <div class="tour-shade"></div>
    </div>

    <div class="wrap tour-content">
        <?= img('cropped-cropped-cropped-cropped-picsart_22-09-30_11-01-38-827-1', site('full_name'), ['width' => 64, 'height' => 60, 'class' => 'tour-logo', 'loading' => 'eager', 'sizes' => '64px']) ?>
        <p class="tour-eyebrow"><?= e($t['eyebrow']) ?></p>
        <h1 class="tour-title">
            <?php foreach ($t['headline'] as $line): ?><span class="tour-line"><span><?= e($line) ?></span></span><?php endforeach; ?>
        </h1>
        <p class="tour-sub"><?= e($t['sub']) ?></p>
        <div class="tour-cta">
            <a class="btn btn-amber btn-lg" href="<?= e(url($t['cta_primary']['path'])) ?>"><?= e($t['cta_primary']['label']) ?></a>
            <a class="btn btn-ghost btn-lg" href="<?= e(url($t['cta_secondary']['path'])) ?>"><?= e($t['cta_secondary']['label']) ?></a>
        </div>
    </div>

    <div class="wrap tour-bar">
        <div class="tour-caption" data-captions>
            <?php foreach ($scenes as $i => $sc): ?>
                <div class="tour-cap<?= $i === 0 ? ' is-active' : '' ?>">
                    <span class="tour-count"><b><?= sprintf('%02d', $i + 1) ?></b> / <?= sprintf('%02d', $total) ?></span>
                    <span class="tour-label"><?= e($sc['label']) ?></span>
                    <?php if ($sc['title'] !== ''): ?>
                        <strong class="tour-cap-title"><?= e($sc['title']) ?></strong>
                        <span class="tour-cap-text"><?= e($sc['text']) ?></span>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>

        <ol class="tour-progress" aria-label="<?= e(t('tour.label')) ?>">
            <?php foreach ($scenes as $i => $sc): ?>
                <li<?= $i === 0 ? ' class="is-active"' : '' ?>>
                    <button type="button" data-go="<?= $i ?>" aria-label="<?= e(t('tour.scene_label', ['n' => $i + 1, 'total' => $total, 'label' => $sc['label']])) ?>"<?= $i === 0 ? ' aria-current="true"' : '' ?>>
                        <span class="bar"><i></i></span>
                    </button>
                </li>
            <?php endforeach; ?>
        </ol>

        <a class="tour-cue" href="<?= e($t['scroll_target']) ?>" aria-label="<?= e($t['scroll_label']) ?>">
            <span><?= e($t['scroll_label']) ?></span>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5v14M5 13l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
    </div>
</section>
