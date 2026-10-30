<?php
/**
 * POST /kirim/ - receives the quote / contact / pop-up forms.
 * Works with fetch() (JSON response) and without JavaScript (redirect back with a flash message).
 */
$wantsJson = (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch');

$respond = static function (array $payload, int $status = 200) use ($wantsJson) {
    if ($wantsJson) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }
    $_SESSION['flash'][$payload['form'] ?? 'quote'] = $payload;
    $dest = ($payload['return'] ?? 'home') === 'contact' ? url('contact/') . '#form-contact' : url() . '#penawaran';
    redirect($dest, 303);
};

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo 'Method Not Allowed';
    return;
}

$form = (string) ($_POST['form'] ?? '');
$return = in_array($_POST['return'] ?? '', ['home', 'contact'], true) ? $_POST['return'] : 'home';
if (!isset(form_schemas()[$form])) {
    $respond(['ok' => false, 'form' => 'quote', 'return' => $return, 'message' => t('form.msg.unknown')], 400);
}
$base = ['form' => $form, 'return' => $return];

if (!csrf_valid($_POST['csrf'] ?? null)) {
    $respond($base + ['ok' => false, 'message' => t('form.msg.expired')], 419);
}

// Honeypot: bots fill the hidden field. Drop silently, nothing is stored.
if (trim((string) ($_POST['website'] ?? '')) !== '') {
    $respond($base + ['ok' => true, 'message' => t('form.msg.thanks_short')]);
}

// Basic rate limit: 5 submissions per 10 minutes per session.
$now = time();
$hits = array_filter($_SESSION['hits'] ?? [], static fn($t) => $t > $now - 600);
if (count($hits) >= 5) {
    $respond($base + ['ok' => false, 'message' => t('form.msg.rate_limit')], 429);
}

[$clean, $errors] = form_validate($form, $_POST);
if ($errors) {
    $respond($base + ['ok' => false, 'errors' => $errors, 'old' => $clean, 'message' => t('form.msg.check')], 422);
}

if (!form_store($form, $clean)) {
    $respond($base + ['ok' => false, 'old' => $clean, 'message' => t('form.msg.failed')], 500);
}

$hits[] = $now;
$_SESSION['hits'] = array_values($hits);
$respond($base + ['ok' => true, 'message' => t('form.msg.success')]);
