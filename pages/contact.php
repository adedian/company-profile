<?php
$s = site();
$h = data('home');
$topicKey = $_GET['topik'] ?? '';
$topic = in_array($topicKey, ['residential', 'commercial', 'industrial'], true) ? t('contact.topic.' . $topicKey) : null;
$prefill = $topic ? ['pesan' => t('contact.prefill', ['topic' => $topic])] : [];
$mapsHref = 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode($s['address']);
$ico = [
    'phone' => '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    'wa'    => '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z"/>',
    'mail'  => '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    'pin'   => '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
];
$svg = static fn(string $k): string => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $ico[$k] . '</svg>';
render_page_hero(t('contact.title'), 'pexels-los-muertos-crew-8853499', $GLOBALS['page']['crumbs'], t('contact.lead'));
?>

<section class="section sheet sheet--light" aria-label="<?= e(t('contact.section_label')) ?>" style="padding-top: calc(var(--r-sheet) * .6)">
    <div class="wrap">
        <div class="quick" data-stagger>
            <a class="reveal-up stagger-item" href="<?= e($s['phone_href']) ?>"><span class="ci-icon"><?= $svg('phone') ?></span><small><?= e(t('contact.phone')) ?></small><b><?= e($s['phone']) ?></b><span class="go"><?= e(t('contact.call')) ?> <?= arrow_icon() ?></span></a>
            <a class="reveal-up stagger-item" href="<?= e($s['whatsapp_href']) ?>" target="_blank" rel="noopener"><span class="ci-icon"><?= $svg('wa') ?></span><small>WhatsApp</small><b><?= e($s['whatsapp']) ?></b><span class="go"><?= e(t('contact.chat')) ?> <?= arrow_icon() ?></span></a>
            <a class="reveal-up stagger-item" href="mailto:<?= e($s['email']) ?>"><span class="ci-icon"><?= $svg('mail') ?></span><small><?= e(t('contact.email')) ?></small><b><?= e($s['email']) ?></b><span class="go"><?= e(t('contact.send_email')) ?> <?= arrow_icon() ?></span></a>
            <a class="reveal-up stagger-item" href="<?= e($mapsHref) ?>" target="_blank" rel="noopener"><span class="ci-icon"><?= $svg('pin') ?></span><small><?= e(t('contact.office')) ?></small><b>North Junction, Citraland, Surabaya</b><span class="go"><?= e(t('footer.maps')) ?> <?= arrow_icon() ?></span></a>
        </div>
    </div>
</section>

<section class="section sheet sheet--light" aria-labelledby="touch-title" style="padding-top: clamp(24px, 4vw, 48px)">
    <div class="wrap contact-grid">
        <div class="form-card reveal-left">
            <h2 id="touch-title"><?= e(t('contact.touch')) ?></h2>
            <h3 class="form-title"><?= e(t('common.contact_us')) ?></h3>
            <?php if ($topic): ?><p class="pill" style="margin-bottom:14px"><?= e(t('contact.topic')) ?> <b><?= e($topic) ?></b></p><?php endif; ?>
            <?php render_form('contact', ['prefix' => 'contact', 'return' => 'contact', 'prefill' => $prefill]); ?>
        </div>

        <aside class="contact-side reveal-right" aria-label="<?= e(t('contact.details')) ?>">
            <figure class="photo-card">
                <?= img('img_20240529_102719_172-scaled', t('contact.photo_alt'), ['sizes' => '(min-width: 900px) 40vw, 100vw']) ?>
            </figure>
            <h2 class="side-title"><?= e(t('common.contact_us')) ?></h2>
            <ul class="contact-list">
                <li><span class="ci-icon" aria-hidden="true"><?= $svg('phone') ?></span><a href="<?= e($s['phone_href']) ?>"><?= e($s['phone']) ?></a></li>
                <li><span class="ci-icon" aria-hidden="true"><?= $svg('wa') ?></span><a href="<?= e($s['whatsapp_href']) ?>" target="_blank" rel="noopener"><?= e($s['whatsapp']) ?></a></li>
                <li><span class="ci-icon" aria-hidden="true"><?= $svg('mail') ?></span><a href="mailto:<?= e($s['email']) ?>"><?= e($s['email']) ?></a></li>
            </ul>
            <h3 class="side-title" style="font-size:1.3rem"><?= e(t('contact.after')) ?></h3>
            <ol class="next-steps">
                <?php foreach ($h['steps']['items'] as $i => $st): ?>
                    <li><span class="story-icon" style="width:48px;height:54px"><?= img($st['image'], '', ['width' => 96, 'height' => 96, 'sizes' => '32px', 'attrs' => ['style' => 'width:28px;height:28px']]) ?></span><span><b><?= e($st['title']) ?></b><span class="t"><?= e($st['text']) ?></span></span></li>
                <?php endforeach; ?>
            </ol>
        </aside>
    </div>
</section>

<section class="section sheet sheet--white faq-wrap" aria-labelledby="faq-title">
    <?php require INC . '/components/faq.php'; ?>
</section>
