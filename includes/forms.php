<?php
/**
 * Form definitions, rendering, validation and storage.
 *
 * One schema per form drives both the markup and the server-side validation, so the two can never drift.
 * Field labels / placeholders / options are copied from the live site (FluentForm #4, #1 and Formidable #10).
 */

/**
 * Option lists keep their canonical (Indonesian) value: that is what is validated and stored, so the sales team always
 * receives the same wording. Only the visible label is translated (form.opt.<group>.<slug>; value is the fallback).
 */
function form_opt_slug(string $v): string
{
    return trim(preg_replace('/[^a-z0-9]+/', '_', strtolower($v)) ?? '', '_');
}

/** @return array<string,string> value => label */
function form_options(string $group, array $values, ?string $lang = null): array
{
    $out = [];
    foreach ($values as $v) {
        $key = 'form.opt.' . $group . '.' . form_opt_slug($v);
        $label = t($key, [], $lang);
        $out[$v] = $label === $key ? $v : $label;
    }
    return $out;
}

/**
 * Form schemas in the given language (default: the language of the request). The staff e-mail and the stored lead use
 * the Indonesian schema, whatever language the visitor was reading.
 */
function form_schemas(?string $lang = null): array
{
    static $schemas = [];
    $lang = $lang ?? current_lang();
    if (isset($schemas[$lang])) {
        return $schemas[$lang];
    }
    $f = static fn(string $form, string $field, string $part): string => t('form.' . $form . '.' . $field . '.' . $part, [], $lang);

    $buildingTypes = ['Rumah', 'Komersial', 'Industri', 'Fasilitas Umum', 'Lainnya'];
    $roofTypes = ['Dak Beton', 'Galvalum Tanpa Baut', 'Galvalum Berbaut', 'Genteng Beton', 'Genteng Tanah Liat', 'Genteng Aspal', 'Genteng Keramik', 'Genteng Asbes'];
    $powers = ['1300 VA', '2200 VA', '3500 VA', '4400 VA', '5500 VA', '7700 VA', '11000 VA', '13000 VA', '16500 VA', '24000 VA', '33000 VA', '41000 VA', '55000 VA', '60000 VA', 'Lebih dari 60.000 VA'];

    $schemas[$lang] = [
        // Home page "Dapatkan Penawaran" (was FluentForm #4)
        'quote' => [
            'title'  => t('form.quote.title', [], $lang),
            'submit' => t('form.quote.submit', [], $lang),
            'fields' => [
                ['name' => 'nama',    'label' => $f('quote', 'nama', 'label'), 'type' => 'text',   'placeholder' => $f('quote', 'nama', 'ph'), 'autocomplete' => 'name', 'max' => 120],
                ['name' => 'email',   'label' => $f('quote', 'email', 'label'), 'type' => 'email',  'placeholder' => $f('quote', 'email', 'ph'), 'autocomplete' => 'email', 'max' => 160],
                ['name' => 'telepon', 'label' => $f('quote', 'telepon', 'label'), 'type' => 'tel', 'placeholder' => $f('quote', 'telepon', 'ph'), 'autocomplete' => 'tel', 'phone' => true],
                ['name' => 'daya_kva', 'label' => $f('quote', 'daya_kva', 'label'), 'type' => 'number', 'placeholder' => $f('quote', 'daya_kva', 'ph'), 'min' => 0, 'max_value' => 100000, 'step' => 'any'],
                ['name' => 'alamat',  'label' => $f('quote', 'alamat', 'label'), 'type' => 'textarea', 'placeholder' => $f('quote', 'alamat', 'ph'), 'max' => 500, 'rows' => 4],
            ],
        ],

        // Contact page (was FluentForm #1)
        'contact' => [
            'title'  => t('form.contact.title', [], $lang),
            'submit' => t('form.contact.submit', [], $lang),
            'fields' => [
                ['name' => 'nama',    'label' => $f('contact', 'nama', 'label'), 'type' => 'text',  'placeholder' => $f('contact', 'nama', 'ph'), 'autocomplete' => 'name', 'max' => 120],
                ['name' => 'email',   'label' => $f('contact', 'email', 'label'), 'type' => 'email', 'placeholder' => $f('contact', 'email', 'ph'), 'autocomplete' => 'email', 'max' => 160],
                ['name' => 'telepon', 'label' => $f('contact', 'telepon', 'label'), 'type' => 'tel', 'placeholder' => $f('contact', 'telepon', 'ph'), 'autocomplete' => 'tel', 'phone' => true],
                ['name' => 'daya_kva', 'label' => $f('contact', 'daya_kva', 'label'), 'type' => 'number', 'placeholder' => $f('contact', 'daya_kva', 'ph'), 'min' => 0, 'max_value' => 100000, 'step' => 'any'],
                ['name' => 'alamat',  'label' => $f('contact', 'alamat', 'label'), 'type' => 'text', 'placeholder' => $f('contact', 'alamat', 'ph'), 'autocomplete' => 'street-address', 'max' => 300],
                ['name' => 'kota',    'label' => $f('contact', 'kota', 'label'),     'type' => 'text', 'placeholder' => $f('contact', 'kota', 'ph'), 'autocomplete' => 'address-level2', 'max' => 100, 'half' => true],
                ['name' => 'provinsi', 'label' => $f('contact', 'provinsi', 'label'), 'type' => 'text', 'placeholder' => $f('contact', 'provinsi', 'ph'), 'autocomplete' => 'address-level1', 'max' => 100, 'half' => true],
                ['name' => 'kode_pos', 'label' => $f('contact', 'kode_pos', 'label'), 'type' => 'text', 'placeholder' => $f('contact', 'kode_pos', 'ph'), 'autocomplete' => 'postal-code', 'max' => 12, 'required' => false, 'half' => true],
                ['name' => 'pesan',   'label' => $f('contact', 'pesan', 'label'), 'type' => 'textarea', 'placeholder' => $f('contact', 'pesan', 'ph'), 'max' => 2000, 'rows' => 5],
            ],
        ],

        // Pop-up offer form on the home page (was Formidable form #10 "contact-us23")
        'detail' => [
            'title'  => t('form.detail.title', [], $lang),
            'submit' => t('form.detail.submit', [], $lang),
            'fields' => [
                ['name' => 'nama',    'label' => $f('detail', 'nama', 'label'),          'type' => 'text',  'placeholder' => $f('detail', 'nama', 'ph'), 'autocomplete' => 'name', 'max' => 120],
                ['name' => 'telepon', 'label' => $f('detail', 'telepon', 'label'),  'type' => 'tel',   'placeholder' => $f('detail', 'telepon', 'ph'), 'autocomplete' => 'tel', 'phone' => true],
                ['name' => 'email',   'label' => $f('detail', 'email', 'label'),         'type' => 'email', 'placeholder' => $f('detail', 'email', 'ph'), 'autocomplete' => 'email', 'max' => 160],
                ['name' => 'jenis_bangunan', 'label' => $f('detail', 'jenis_bangunan', 'label'), 'type' => 'select', 'placeholder' => $f('detail', 'jenis_bangunan', 'ph'), 'options' => form_options('building', $buildingTypes, $lang)],
                ['name' => 'jenis_atap',     'label' => $f('detail', 'jenis_atap', 'label'),     'type' => 'select', 'placeholder' => $f('detail', 'jenis_atap', 'ph'), 'options' => form_options('roof', $roofTypes, $lang)],
                ['name' => 'kapasitas_daya', 'label' => $f('detail', 'kapasitas_daya', 'label'), 'type' => 'select', 'placeholder' => $f('detail', 'kapasitas_daya', 'ph'), 'options' => form_options('power', $powers, $lang)],
                ['name' => 'tagihan_listrik', 'label' => $f('detail', 'tagihan_listrik', 'label'), 'type' => 'number', 'placeholder' => $f('detail', 'tagihan_listrik', 'ph'), 'min' => 0, 'max_value' => 999999999, 'step' => '1'],
                ['name' => 'alamat',  'label' => $f('detail', 'alamat', 'label'), 'type' => 'textarea', 'placeholder' => $f('detail', 'alamat', 'ph'), 'max' => 500, 'rows' => 3],
            ],
        ],
    ];

    return $schemas[$lang];
}
/* ------------------------------------------------------------------ CSRF / flash */

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_valid(?string $token): bool
{
    return is_string($token) && !empty($_SESSION['csrf']) && hash_equals($_SESSION['csrf'], $token);
}

function form_flash_pull(string $form): ?array
{
    $flash = $_SESSION['flash'][$form] ?? null;
    unset($_SESSION['flash'][$form]);
    return $flash;
}

/* ------------------------------------------------------------------ rendering */

/**
 * Render a form. $prefix keeps element IDs unique when a form appears twice on one page.
 */
function render_form(string $form, array $opts = []): void
{
    $schemas = form_schemas();
    $schema = $schemas[$form];
    $prefix = $opts['prefix'] ?? $form;
    $return = $opts['return'] ?? 'home';
    $flash = form_flash_pull($form);
    $old = $flash['old'] ?? [];
    $errors = $flash['errors'] ?? [];
    foreach ((array) ($opts['prefill'] ?? []) as $pk => $pv) {   // e.g. contact/?topik=industrial pre-fills the message
        if (($old[$pk] ?? '') === '') {
            $old[$pk] = $pv;
        }
    }
    $class = 'form' . (!empty($opts['class']) ? ' ' . $opts['class'] : '');
    ?>
    <form class="<?= e($class) ?>" id="form-<?= e($prefix) ?>" method="post" action="<?= e(url('kirim/')) ?>" novalidate data-form="<?= e($form) ?>">
        <input type="hidden" name="form" value="<?= e($form) ?>">
        <input type="hidden" name="return" value="<?= e($return) ?>">
        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
        <?php /* honeypot: real visitors never see or fill it */ ?>
        <div class="hp" aria-hidden="true">
            <label for="<?= e($prefix) ?>-website"><?= e(t('form.honeypot')) ?></label>
            <input type="text" id="<?= e($prefix) ?>-website" name="website" tabindex="-1" autocomplete="off">
        </div>

        <div class="form-grid">
        <?php foreach ($schema['fields'] as $f):
            $id = $prefix . '-' . $f['name'];
            $required = $f['required'] ?? true;
            $val = $old[$f['name']] ?? '';
            $err = $errors[$f['name']] ?? '';
            $half = !empty($f['half']);
            $errId = $id . '-err';
            ?>
            <div class="field<?= $half ? ' field-third' : '' ?><?= $err !== '' ? ' has-error' : '' ?>">
                <label for="<?= e($id) ?>"><?= e($f['label']) ?><?php if ($required): ?> <span class="req" aria-hidden="true">*</span><?php endif; ?></label>
                <?php if ($f['type'] === 'textarea'): ?>
                    <textarea id="<?= e($id) ?>" name="<?= e($f['name']) ?>" rows="<?= (int) ($f['rows'] ?? 4) ?>" placeholder="<?= e($f['placeholder'] ?? '') ?>"
                        maxlength="<?= (int) ($f['max'] ?? 1000) ?>" <?= $required ? 'required' : '' ?> aria-describedby="<?= e($errId) ?>"<?= $err !== '' ? ' aria-invalid="true"' : '' ?>><?= e($val) ?></textarea>
                <?php elseif ($f['type'] === 'select'): ?>
                    <select id="<?= e($id) ?>" name="<?= e($f['name']) ?>" <?= $required ? 'required' : '' ?> aria-describedby="<?= e($errId) ?>"<?= $err !== '' ? ' aria-invalid="true"' : '' ?>>
                        <option value=""><?= e($f['placeholder']) ?></option>
                        <?php foreach ($f['options'] as $optValue => $optLabel): ?>
                            <option value="<?= e($optValue) ?>"<?= $val === (string) $optValue ? ' selected' : '' ?>><?= e($optLabel) ?></option>
                        <?php endforeach; ?>
                    </select>
                <?php else: ?>
                    <input id="<?= e($id) ?>" name="<?= e($f['name']) ?>" type="<?= e($f['type']) ?>" value="<?= e($val) ?>" placeholder="<?= e($f['placeholder'] ?? '') ?>"
                        <?php if (!empty($f['autocomplete'])): ?>autocomplete="<?= e($f['autocomplete']) ?>"<?php endif; ?>
                        <?php if ($f['type'] === 'number'): ?>inputmode="decimal" min="<?= e((string) ($f['min'] ?? 0)) ?>" max="<?= e((string) ($f['max_value'] ?? '')) ?>" step="<?= e($f['step'] ?? 'any') ?>"<?php endif; ?>
                        <?php if ($f['type'] === 'tel'): ?>inputmode="tel" pattern="[0-9+\s\(\)\-]{6,20}" maxlength="20"<?php endif; ?>
                        <?php if (!empty($f['max']) && $f['type'] !== 'number'): ?>maxlength="<?= (int) $f['max'] ?>"<?php endif; ?>
                        <?= $required ? 'required' : '' ?> aria-describedby="<?= e($errId) ?>"<?= $err !== '' ? ' aria-invalid="true"' : '' ?>>
                <?php endif; ?>
                <p class="field-error" id="<?= e($errId) ?>"><?= e($err) ?></p>
            </div>
        <?php endforeach; ?>
        </div>

        <div class="form-actions">
            <button type="submit" class="btn btn-amber"><span class="btn-label"><?= e($schema['submit']) ?></span><span class="btn-spinner" aria-hidden="true"></span></button>
        </div>
        <div class="form-status<?= !empty($flash['ok']) ? ' is-ok' : (!empty($flash['message']) ? ' is-error' : '') ?>" role="status" aria-live="polite" tabindex="-1"><?= e($flash['message'] ?? '') ?></div>
    </form>
    <?php
}

/* ------------------------------------------------------------------ validation */

/**
 * @return array{0: array<string,string>, 1: array<string,string>} [clean values, errors]
 */
function form_validate(string $form, array $input): array
{
    $schema = form_schemas()[$form];
    $clean = [];
    $errors = [];

    foreach ($schema['fields'] as $f) {
        $name = $f['name'];
        $raw = $input[$name] ?? '';
        $v = is_string($raw) ? trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $raw) ?? '') : '';
        $required = $f['required'] ?? true;

        if ($v === '') {
            if ($required) {
                $errors[$name] = t('form.err.required');
            }
            $clean[$name] = '';
            continue;
        }

        $max = $f['max'] ?? 1000;
        if (in_array($f['type'], ['text', 'textarea', 'email', 'tel'], true) && mb_strlen($v) > $max) {
            $errors[$name] = t('form.err.max', ['max' => $max]);
        }

        switch ($f['type']) {
            case 'email':
                if (!filter_var($v, FILTER_VALIDATE_EMAIL)) {
                    $errors[$name] = t('form.err.email');
                }
                break;
            case 'tel':
                if (!preg_match('/^[0-9+()\-\s]{6,20}$/', $v) || strlen(preg_replace('/\D/', '', $v)) < 6) {
                    $errors[$name] = t('form.err.tel');
                }
                break;
            case 'number':
                if (!is_numeric($v) || (float) $v < ($f['min'] ?? 0) || (float) $v > ($f['max_value'] ?? PHP_INT_MAX)) {
                    $errors[$name] = t('form.err.number');
                }
                break;
            case 'select':
                if (!array_key_exists($v, $f['options'])) {
                    $errors[$name] = t('form.err.select');
                }
                break;
        }
        $clean[$name] = $v;
    }

    return [$clean, $errors];
}

/* ------------------------------------------------------------------ storage + mail */

/**
 * Persist the submission (JSON Lines, one file per month) and optionally e-mail it.
 * Returns true only when the data has really been stored.
 */
function form_store(string $form, array $clean): bool
{
    $dir = cfg('leads_dir');
    if (!is_dir($dir) && !@mkdir($dir, 0750, true)) {
        error_log('[hme] leads dir not writable: ' . $dir);
        return false;
    }

    $record = [
        'at'   => date('c'),
        'form' => $form,
        'lang' => current_lang(),
        'ip'   => $_SERVER['REMOTE_ADDR'] ?? '',
        'ua'   => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 200),
        'data' => $clean,
    ];
    $line = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    $file = $dir . '/' . date('Y-m') . '.jsonl';

    if (@file_put_contents($file, $line, FILE_APPEND | LOCK_EX) === false) {
        error_log('[hme] could not write lead file: ' . $file);
        return false;
    }

    if (cfg('send_mail')) {
        $schema = form_schemas(DEFAULT_LANG)[$form];
        $body = "Formulir: {$schema['title']} ({$form})\nBahasa situs: " . strtoupper(current_lang()) . "\nWaktu: " . date('d/m/Y H:i') . "\n\n";
        foreach ($schema['fields'] as $f) {
            $body .= $f['label'] . ': ' . ($clean[$f['name']] ?? '') . "\n";
        }
        $replyTo = filter_var($clean['email'] ?? '', FILTER_VALIDATE_EMAIL) ? $clean['email'] : cfg('mail_from');
        $headers = [
            'From' => cfg('mail_from'),
            'Reply-To' => $replyTo,
            'Content-Type' => 'text/plain; charset=UTF-8',
        ];
        $sent = @mail(cfg('mail_to'), '[Website HME] ' . $schema['title'] . ' - ' . preg_replace('/\s+/', ' ', $clean['nama'] ?? ''), $body, $headers);
        if (!$sent) {
            error_log('[hme] mail() failed for form ' . $form . '; lead is kept in ' . $file);
        }
    }

    return true;
}
