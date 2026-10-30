</main>

<?php
$s = site();
$socialIcons = [
    'Facebook'  => '<path d="M14 8.5h3V4.5h-3a4 4 0 0 0-4 4V11H7v4h3v6h4v-6h3l1-4h-4V9c0-.3.2-.5.5-.5z"/>',
    'Instagram' => '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.2 6.8h.01"/>',
    'Linkedin'  => '<path d="M5 9.5h3.2V20H5zM6.6 4.4a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zM10.6 9.5h3v1.5c.6-1 1.8-1.7 3.3-1.7 3.1 0 3.8 2 3.8 4.7V20h-3.2v-5.2c0-1.3-.3-2.4-1.7-2.4s-2 1-2 2.4V20h-3.2z"/>',
];
if (empty($GLOBALS['page']['hide_footer'])): ?>
<footer class="site-footer">
    <div class="wrap footer-grid">
        <div class="footer-brand">
            <a class="brand brand--footer" href="<?= e(url()) ?>" aria-label="<?= e($s['full_name']) ?> - <?= e(t('nav.home')) ?>">
                <?= img('cropped-cropped-cropped-cropped-picsart_22-09-30_11-01-38-827-1', $s['full_name'], ['width' => 64, 'height' => 60, 'class' => 'brand-logo']) ?>
            </a>
            <h2 class="footer-title">PT HEXA MULTI ENERGI</h2>
            <p><?= e($s['tagline']) ?></p>
            <p><a class="btn btn-amber btn-sm" href="<?= e(url('contact/')) ?>" data-magnetic><?= e(t('footer.cta')) ?> <?= arrow_icon() ?></a></p>
            <ul class="social" aria-label="<?= e(t('footer.social')) ?>">
                <?php foreach ($s['social'] as $soc): ?>
                    <li><a href="<?= e($soc['href']) ?>" target="_blank" rel="noopener" aria-label="<?= e($soc['label']) ?>">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="<?= $soc['label'] === 'Instagram' ? 'none' : 'currentColor' ?>" stroke="<?= $soc['label'] === 'Instagram' ? 'currentColor' : 'none' ?>" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><?= $socialIcons[$soc['label']] ?? '' ?></svg>
                        <span><?= e($soc['label']) ?></span></a></li>
                <?php endforeach; ?>
            </ul>
        </div>

        <?php foreach ($s['footer_links'] as $group): ?>
            <nav class="footer-col" aria-label="<?= e($group['title']) ?>">
                <h2 class="footer-heading"><?= e($group['title']) ?></h2>
                <ul>
                    <?php foreach ($group['links'] as $l): ?>
                        <li><a href="<?= e(url($l['path'])) ?>"><?= e($l['label']) ?></a></li>
                    <?php endforeach; ?>
                </ul>
            </nav>
        <?php endforeach; ?>

        <div class="footer-col footer-contact">
            <h2 class="footer-heading"><?= e(t('footer.contact')) ?></h2>
            <address>
                <p><?= e($s['address']) ?></p>
                <ul>
                    <li><a href="<?= e($s['phone_href']) ?>"><?= e($s['phone']) ?></a></li>
                    <li><a href="<?= e($s['whatsapp_href']) ?>" target="_blank" rel="noopener"><?= e($s['whatsapp']) ?></a></li>
                    <li><a href="mailto:<?= e($s['email']) ?>"><?= e($s['email']) ?></a></li>
                    <li><a href="https://www.google.com/maps/search/?api=1&amp;query=<?= e(rawurlencode($s['address'])) ?>" target="_blank" rel="noopener"><?= e(t('footer.maps')) ?></a></li>
                </ul>
            </address>
        </div>
    </div>

    <div class="footer-bottom">
        <div class="wrap footer-bottom-in">
            <p><?= e($s['copyright']) ?></p>
            <a class="footer-top" href="#content" data-to-top><?= e(t('footer.top')) ?> <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        </div>
    </div>
</footer>
<?php endif; ?>

<button class="to-top" type="button" aria-label="<?= e(t('footer.top')) ?>" data-to-top-btn>
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
</button>

<script type="application/json" id="hme-i18n"><?= json_encode(t_group('js.'), JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
<script src="<?= e(asset('js/smooth-scroll.js')) ?>" defer></script>
<script src="<?= e(asset('js/motion.js')) ?>" defer></script>
<script src="<?= e(asset('js/scroll-reveal.js')) ?>" defer></script>
<script src="<?= e(asset('js/interactions.js')) ?>" defer></script>
<?php foreach ($GLOBALS['page']['assets']['js'] ?? [] as $js): ?>
<script src="<?= e(asset($js)) ?>" defer></script>
<?php endforeach; ?>
</body>
</html>
