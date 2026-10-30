<?php
$s = site();
$co = company();
render_page_hero(t('career.title'), 'pexels-los-muertos-crew-8853499', $GLOBALS['page']['crumbs'], t('career.lead'));
?>

<section class="section sheet sheet--light" aria-labelledby="join-title" style="padding-top: calc(var(--section-y) * .8)">
    <div class="wrap career-split">
        <figure class="cat-fig reveal-mask"><?= img('hme-hero-roof', t('career.hero_alt'), ['sizes' => '(min-width: 900px) 48vw, 94vw']) ?></figure>
        <div class="cat-copy">
            <p class="eyebrow reveal-up"><?= e(t('career.eyebrow')) ?></p>
            <h2 id="join-title" data-split><?= e(t('career.join_title')) ?></h2>
            <p class="lead reveal-up"><?= e(t('career.join_lead_1')) ?><br><?= e(t('career.join_lead_2')) ?></p>
            <p class="reveal-up" style="color: var(--color-muted)"><?= e(t('career.team_text')) ?></p>
            <ul class="team-chips reveal-up" aria-label="<?= e(t('career.teams_label')) ?>">
                <?php foreach ($co['teams'] as $t): ?><li class="pill"><?= e($t) ?></li><?php endforeach; ?>
            </ul>
            <p class="reveal-up"><a class="btn btn-amber" href="mailto:<?= e($s['career_email']) ?>" data-magnetic><?= e(t('career.apply')) ?> <?= arrow_icon() ?></a></p>
        </div>
    </div>
</section>

<section class="section sheet sheet--white" aria-labelledby="open-title">
    <div class="wrap">
        <h2 id="open-title" class="center-title" data-split><?= e(t('career.open_title')) ?></h2>
        <p class="center reveal-up" style="color: var(--color-muted); margin-top: 8px"><?= e(t('career.click_zoom')) ?></p>
        <div class="career-grid" data-stagger>
            <?php foreach (['3-1', '2-1', '1-1'] as $k): ?>
                <figure class="career-card reveal-scale stagger-item">
                    <button type="button" data-lightbox aria-label="<?= e(t('career.zoom')) ?>"><?= img($k, t('career.poster_alt'), ['sizes' => '(min-width: 900px) 360px, 92vw']) ?></button>
                </figure>
            <?php endforeach; ?>
        </div>
        <p class="center-cta reveal-up">
            <a class="btn btn-amber btn-lg" href="mailto:<?= e($s['career_email']) ?>" data-magnetic><?= e(t('career.apply')) ?> <?= arrow_icon() ?></a>
        </p>
    </div>
</section>
<?php $cta = ['heading' => t('career.cta_heading'), 'lead' => t('career.cta_lead'), 'image' => 'hme-factory-roof', 'button' => t('common.contact_us')]; require INC . '/components/cta-visual.php'; ?>
