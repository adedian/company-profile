<?php
/**
 * Project explorer: filter by category, pick a project, see capacity charts.
 * Data: company()['portfolio'] = "Our Portfolio" of the official Company Profile (names + capacities unchanged).
 * Behaviour: assets/js/solar-ui.js (initShowcase).
 */
$c = company();
$list = $c['portfolio'];
$cats = ['industri' => t('showcase.cat.industri'), 'komersial' => t('showcase.cat.komersial'), 'residensial' => t('showcase.cat.residensial')];
$count = ['semua' => count($list)];
foreach ($list as $p) { $count[$p['cat']] = ($count[$p['cat']] ?? 0) + 1; }
$first = $list[0];
$fp = img_parts($first['image']);
$charts = ['industri' => [$cats['industri'], 'MWp'], 'komersial' => [$cats['komersial'], 'kWp']];
?>
<div class="pf" data-showcase>
    <div class="pf-filters" role="group" aria-label="<?= e(t('showcase.filter_label')) ?>">
        <button class="pf-chip" type="button" data-filter="semua" aria-pressed="true"><?= e(t('showcase.all')) ?> <span><?= $count['semua'] ?></span></button>
        <?php foreach ($cats as $k => $label): ?>
            <button class="pf-chip" type="button" data-filter="<?= e($k) ?>" aria-pressed="false"><?= e($label) ?> <span><?= (int) ($count[$k] ?? 0) ?></span></button>
        <?php endforeach; ?>
    </div>

    <div class="pf-main">
        <figure class="pf-stage" data-stage>
            <img data-stage-img src="<?= e($fp[0]) ?>" srcset="<?= e($fp[1]) ?>" sizes="(min-width: 960px) 58vw, 94vw" width="<?= (int) $fp[2] ?>" height="<?= (int) $fp[3] ?>" alt="<?= e(t('showcase.project_alt', ['name' => $first['name']])) ?>" loading="lazy" decoding="async">
            <figcaption>
                <span class="pf-cat" data-stage-cat><?= e($cats[$first['cat']]) ?></span>
                <span class="pf-name" data-stage-name><?= e($first['name']) ?></span>
                <span class="pf-cap" data-stage-cap><?= e($first['cap']) ?></span>
            </figcaption>
        </figure>

        <ul class="pf-list" aria-label="<?= e(t('showcase.list_label')) ?>">
            <?php foreach ($list as $i => $p): $ip = img_parts($p['image']); ?>
                <li data-cat="<?= e($p['cat']) ?>">
                    <button class="pf-item" type="button" data-key="<?= e($p['key']) ?>" data-cat-label="<?= e($cats[$p['cat']]) ?>" data-name="<?= e($p['name']) ?>" data-cap="<?= e($p['cap']) ?>"
                        data-src="<?= e($ip[0]) ?>" data-srcset="<?= e($ip[1]) ?>" data-w="<?= (int) $ip[2] ?>" data-h="<?= (int) $ip[3] ?>" aria-pressed="<?= $i === 0 ? 'true' : 'false' ?>">
                        <?= img($p['image'], '', ['width' => 88, 'height' => 66, 'sizes' => '88px']) ?>
                        <span><b><?= e($p['short']) ?></b><small><?= e($p['cap']) ?></small></span>
                    </button>
                </li>
            <?php endforeach; ?>
        </ul>
    </div>

    <div class="pf-charts" data-charts>
        <?php foreach ($charts as $cat => [$label, $unit]):
            $rows = array_values(array_filter($list, static fn($p) => $p['cat'] === $cat));
            $max = max(array_column($rows, 'v'));
            $total = array_sum(array_column($rows, 'v'));
            $dec = $unit === 'MWp' ? 2 : 1;
            ?>
            <section class="pf-chart reveal-up" data-chart="<?= e($cat) ?>" aria-label="<?= e(t('showcase.chart_label', ['cat' => mb_strtolower($label)])) ?>">
                <h3><?= e($label) ?> (<?= e($unit) ?>) <small><?= e(t('showcase.total')) ?> <?= e(num($total, $dec)) ?> <?= e($unit) ?></small></h3>
                <ul class="pf-bars">
                    <?php foreach ($rows as $p): ?>
                        <li><button class="pf-bar" type="button" data-key="<?= e($p['key']) ?>" aria-label="<?= e($p['name']) ?>, <?= e($p['cap']) ?>">
                            <span><?= e($p['short']) ?></span>
                            <span class="tr"><i style="--w: <?= e(number_format($p['v'] / $max * 100, 1, '.', '')) ?>%"></i></span>
                            <span class="v"><?= e(rtrim(rtrim(num($p['v'], 2), '0'), current_lang() === 'en' ? '.' : ',')) ?></span>
                        </button></li>
                    <?php endforeach; ?>
                </ul>
            </section>
        <?php endforeach; ?>
    </div>
    <p class="pf-foot"><span><?= e($h['projects']['source']) ?></span><a class="btn btn-ghost" href="<?= e(url('company-profile/')) ?>"><?= e($h['projects']['link']) ?></a></p>
</div>
