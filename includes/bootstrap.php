<?php
declare(strict_types=1);

define('ROOT', dirname(__DIR__));
define('INC', ROOT . '/includes');

$GLOBALS['cfg'] = require ROOT . '/config.php';

// Never show PHP errors to visitors; log them instead.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Compress the HTML ourselves when the web server does not (hosts without mod_deflate). Servers that already compress skip responses that carry a Content-Encoding.
if (extension_loaded('zlib') && !ini_get('zlib.output_compression') && PHP_SAPI !== 'cli' && str_contains($_SERVER['HTTP_ACCEPT_ENCODING'] ?? '', 'gzip')) {
    ob_start('ob_gzhandler');
}

mb_internal_encoding('UTF-8');
date_default_timezone_set('Asia/Jakarta');

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

require INC . '/functions.php';
require INC . '/language.php';
require INC . '/forms.php';

// The language is decided by the URL (/en/ = English, otherwise Indonesian) before any text is produced.
lang_boot();
$GLOBALS['site'] = data('site');
