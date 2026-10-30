<?php
/**
 * Company Profile page: opens the official company profile directly, full screen under the site header.
 *  - presentation/index.html  -> interactive presentation, loaded straight into a full-height frame
 *  - *.pdf                    -> used (full-height viewer) when there is no presentation
 *  - HME-Company-Profile.zip  -> offline copy, offered as a download
 * Links are only rendered for files that actually exist.
 */
$dir = ROOT . '/assets/company-profile';
$presentation = is_file($dir . '/presentation/index.html');
$pdfFiles = glob($dir . '/*.pdf') ?: [];
$pdf = $pdfFiles ? basename($pdfFiles[0]) : null;
$zip = is_file($dir . '/HME-Company-Profile.zip') ? 'HME-Company-Profile.zip' : null;

$fmt = static function (string $file): string {
    $b = filesize($file);
    return $b >= 1048576 ? num($b / 1048576, 1) . ' MB' : num($b / 1024, 0) . ' KB';
};

$presentationUrl = url('assets/company-profile/presentation/index.html') . (current_lang() === DEFAULT_LANG ? '' : '?lang=' . current_lang());
$pdfUrl = $pdf ? url('assets/company-profile/' . $pdf) : null;
$hasContent = $presentation || $pdf;

if ($hasContent) {
    $GLOBALS['page']['hide_footer'] = true; // the profile owns the whole screen
}
?>
<h1 class="sr-only"><?= e(t('profile.h1')) ?></h1>

<?php if ($hasContent): ?>
    <section class="profile-full" aria-label="<?= e(t('profile.frame_title')) ?>">
        <?php if ($presentation): ?>
            <iframe src="<?= e($presentationUrl) ?>" title="<?= e(t('profile.frame_title')) ?>" allow="fullscreen"></iframe>
        <?php else: ?>
            <object data="<?= e($pdfUrl) ?>#view=FitH" type="application/pdf" aria-label="<?= e(t('profile.pdf_label')) ?>">
                <p class="profile-fallback"><?= e(t('profile.pdf_unsupported')) ?> <a href="<?= e($pdfUrl) ?>" target="_blank" rel="noopener"><?= e(t('profile.pdf_open_new')) ?></a>.</p>
            </object>
        <?php endif; ?>

        <div class="profile-tools" role="group" aria-label="<?= e(t('profile.options')) ?>">
            <?php if ($presentation): ?>
                <a href="<?= e($presentationUrl) ?>" target="_blank" rel="noopener"><?= e(t('profile.open_new_tab')) ?></a>
            <?php endif; ?>
            <?php if ($pdf): ?>
                <a href="<?= e($pdfUrl) ?>" target="_blank" rel="noopener"><?= e(t('profile.open_pdf')) ?></a>
                <a href="<?= e($pdfUrl) ?>" download><?= e(t('profile.download_pdf', ['size' => $fmt($dir . '/' . $pdf)])) ?></a>
            <?php endif; ?>
            <?php if ($zip): ?>
                <a href="<?= e(url('assets/company-profile/' . $zip)) ?>" download><?= e(t('profile.download_zip', ['size' => $fmt($dir . '/' . $zip)])) ?></a>
            <?php endif; ?>
        </div>
    </section>
<?php else: ?>
    <section class="section">
        <div class="wrap">
            <div class="empty-state card">
                <span class="hex hex--xl" aria-hidden="true">!</span>
                <h2><?= e(t('profile.missing_title')) ?></h2>
                <p><?= e(t('profile.missing_text')) ?> <a href="<?= e(site('whatsapp_href')) ?>" target="_blank" rel="noopener">WhatsApp</a>.</p>
            </div>
        </div>
    </section>
<?php endif; ?>
