<?php
/**
 * CLI check for the language files:  php tools/check-translations.php
 *  - id.php and en.php must contain exactly the same keys and the same {placeholders}
 *  - every data overlay must have the same list lengths as its base file (otherwise array_replace_recursive would keep stale items)
 */
define('ROOT', dirname(__DIR__));
define('INC', ROOT . '/includes');
$cfg = require ROOT . '/config.php';
$GLOBALS['cfg'] = $cfg;
require INC . '/functions.php';

$fail = 0;
$id = require INC . '/translations/id.php';
$en = require INC . '/translations/en.php';

foreach (array_diff_key($id, $en) as $k => $_) { echo "missing in en.php: $k\n"; $fail++; }
foreach (array_diff_key($en, $id) as $k => $_) { echo "missing in id.php: $k\n"; $fail++; }
foreach (array_intersect_key($id, $en) as $k => $v) {
    preg_match_all('/\{(\w+)\}/', $v, $a);
    preg_match_all('/\{(\w+)\}/', $en[$k], $b);
    sort($a[1]); sort($b[1]);
    if ($a[1] !== $b[1]) { echo "placeholder mismatch: $k\n"; $fail++; }
    if ($v === '' && $en[$k] !== '' && $k !== 'news.note') { echo "empty in id.php: $k\n"; $fail++; }
    if ($en[$k] === '' && $k !== 'news.note') { echo "empty in en.php: $k\n"; $fail++; }
}

/** Walk overlay and base together and report list-length mismatches / unknown keys. */
function walk($base, $over, string $path, int &$fail): void
{
    if (!is_array($over)) { return; }
    if (!is_array($base)) { echo "overlay has array where base has a scalar: $path\n"; $fail++; return; }
    $baseIsList = $base !== [] && array_keys($base) === range(0, count($base) - 1);
    $overIsList = $over !== [] && array_keys($over) === range(0, count($over) - 1);
    if ($baseIsList && $overIsList && count($base) !== count($over) && !preg_match('/(\.cta|\.benefits\.\d+)$/', $path)) {   // tuples ([label, url]) may be overridden partially
        // partial lists of arrays are fine only when they are item overlays; scalar lists must match exactly
        $scalarList = !is_array(reset($base));
        if ($scalarList || count($over) > count($base)) { echo "list length differs at $path: base " . count($base) . ", overlay " . count($over) . "\n"; $fail++; }
    }
    foreach ($over as $k => $v) {
        if (!array_key_exists($k, $base)) { echo "overlay key not in base: $path.$k\n"; $fail++; continue; }
        walk($base[$k], $v, $path . '.' . $k, $fail);
    }
}
foreach (['id', 'en'] as $lang) {
    foreach (glob(INC . '/translations/data/' . $lang . '/*.php') as $file) {
        $name = basename($file, '.php');
        $base = require INC . '/data/' . $name . '.php';
        walk($base, require $file, $lang . '/' . $name, $fail);
    }
}
echo $fail === 0 ? "OK: " . count($id) . " UI keys in both languages, overlays consistent.\n" : "$fail problem(s).\n";
exit($fail === 0 ? 0 : 1);
