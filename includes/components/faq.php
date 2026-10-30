<?php
/** FAQ block (home + contact). Expects $h['faq'] and $s. */
?>
<div class="wrap faq">
    <div class="faq-intro reveal-left">
        <h2 id="faq-title" data-split><?= e($h['faq']['heading_a']) ?> <?= e($h['faq']['heading_b']) ?> <?= e($h['faq']['heading_c']) ?></h2>
        <h3 class="faq-help"><?= e($h['faq']['help_title']) ?></h3>
        <a class="btn btn-amber" href="<?= e($s['whatsapp_href']) ?>" target="_blank" rel="noopener" data-magnetic><?= e($h['faq']['help_cta']) ?></a>
    </div>
    <div class="faq-list reveal-right">
        <?php foreach ($h['faq']['items'] as $item): ?>
            <details class="faq-item" name="faq">
                <summary><span><?= e($item['q']) ?></span><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
                <div class="faq-body">
                    <?php if ($item['a'] !== null): ?>
                        <p><?= e($item['a']) ?></p>
                    <?php else: ?>
                        <p><?= e($h['faq']['help_intro']) ?></p>
                        <ul class="help-list">
                            <li><?= e(t('faq.phone')) ?> <a href="<?= e($s['phone_href']) ?>"><?= e($s['phone']) ?></a></li>
                            <li><?= e(t('faq.whatsapp')) ?> <a href="<?= e($s['whatsapp_href']) ?>" target="_blank" rel="noopener"><?= e($s['whatsapp']) ?></a></li>
                            <li><?= e(t('faq.email')) ?> <a href="mailto:<?= e($s['email']) ?>"><?= e($s['email']) ?></a></li>
                        </ul>
                    <?php endif; ?>
                </div>
            </details>
        <?php endforeach; ?>
    </div>
</div>
