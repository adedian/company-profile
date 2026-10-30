<?php
/** Closing call-to-action with a real project photo behind it. Options via $cta (heading, lead, image, buttons). */
$s = site();
$cta = $cta ?? [];
$heading = $cta['heading'] ?? data('home')['cta']['heading'];
$lead = $cta['lead'] ?? t('cta.lead');
$image = $cta['image'] ?? 'hme-aerial-white';
$button = $cta['button'] ?? data('home')['cta']['button'];
?>
<section class="cta-visual" aria-labelledby="cta-title">
    <div class="cta-visual-bg" aria-hidden="true"><?= img($image, '', ['sizes' => '100vw', 'attrs' => ['data-parallax' => '0.1']]) ?></div>
    <div class="cta-hexes" aria-hidden="true">
        <i style="--x: 6%; --y: 14%; --s: 110px"></i><i style="--x: 88%; --y: 18%; --s: 70px"></i><i style="--x: 78%; --y: 66%; --s: 140px"></i><i style="--x: 14%; --y: 70%; --s: 64px"></i>
    </div>
    <div class="wrap">
        <h2 id="cta-title" data-split><?= e($heading) ?></h2>
        <p class="lead reveal-up"><?= e($lead) ?></p>
        <div class="cta-row reveal-up">
            <a class="btn btn-amber btn-lg" href="<?= e(url('contact/')) ?>" data-magnetic><?= e($button) ?> <?= arrow_icon() ?></a>
            <a class="btn btn-ghost btn-lg" href="<?= e($s['whatsapp_href']) ?>" target="_blank" rel="noopener" data-magnetic><?= e(t('nav.whatsapp')) ?></a>
        </div>
        <p class="cta-contact reveal-up"><a href="<?= e($s['phone_href']) ?>"><?= e($s['phone']) ?></a><a href="mailto:<?= e($s['email']) ?>"><?= e($s['email']) ?></a></p>
    </div>
</section>
