<?php
/**
 * Language dropdown in the header (flag + name). Every entry is a real link to the same page in the other language,
 * so it works without JavaScript and is crawlable; assets/js/interactions.js adds open/close, Escape and arrow keys.
 */
$cur = current_lang();
$rest = $GLOBALS['lang_rest'] ?? '/';
if (($GLOBALS['page']['key'] ?? '') === '404') {
    $rest = '/';   // a missing page has no counterpart, offer the home page
}
$query = $_GET;
unset($query['hl']);

$switchHref = static function (string $code) use ($rest, $query, $cur): string {
    $q = $query;
    if ($code === DEFAULT_LANG && $code !== $cur) {
        $q = ['hl' => $code] + $q;   // the server remembers the choice, then shows the clean URL
    }
    return lang_page_path($rest, $code) . ($q ? '?' . http_build_query($q) : '');
};

/** Flag from a shared sprite (inline SVG: emoji flags are not drawn on Windows). */
$flag = static fn(string $code): string => '<svg class="flag" viewBox="0 0 60 40" width="24" height="16" aria-hidden="true" focusable="false"><use href="#flag-' . e($code) . '"/></svg>';
?>
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
    <defs>
        <symbol id="flag-id" viewBox="0 0 60 40"><rect width="60" height="20" fill="#e70011"/><rect y="20" width="60" height="20" fill="#fff"/></symbol>
        <symbol id="flag-en" viewBox="0 0 60 40">
            <clipPath id="flag-en-clip"><rect width="60" height="40"/></clipPath>
            <g clip-path="url(#flag-en-clip)">
                <rect width="60" height="40" fill="#012169"/>
                <path d="M0 0l60 40M60 0L0 40" stroke="#fff" stroke-width="8"/>
                <path d="M0 0l60 40M60 0L0 40" stroke="#c8102e" stroke-width="3.4"/>
                <path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="13"/>
                <path d="M30 0v40M0 20h60" stroke="#c8102e" stroke-width="8"/>
            </g>
        </symbol>
    </defs>
</svg>
<div class="lang-switch" data-lang-switch>
    <button class="lang-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="lang-menu"
        aria-label="<?= e(t('lang.button_label', ['language' => LANGUAGES[$cur]['name']])) ?>">
        <?= $flag($cur) ?>
        <span class="lang-name"><?= e(LANGUAGES[$cur]['label']) ?></span>
        <span class="lang-code" aria-hidden="true"><?= e(LANGUAGES[$cur]['short']) ?></span>
        <svg class="lang-caret" viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <ul class="lang-menu" id="lang-menu" aria-label="<?= e(t('lang.menu_label')) ?>">
        <?php foreach (LANGUAGES as $code => $info): $on = $code === $cur; ?>
            <li>
                <a href="<?= e($switchHref($code)) ?>" hreflang="<?= e($code) ?>" lang="<?= e($code) ?>" data-lang="<?= e($code) ?>"<?= $on ? ' aria-current="true"' : '' ?>>
                    <?= $flag($code) ?>
                    <span class="lang-item-name"><?= e($info['name']) ?></span>
                    <svg class="lang-check" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </a>
            </li>
        <?php endforeach; ?>
    </ul>
</div>
