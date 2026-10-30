<?php
$h = data('home');
$s = site();
$co = company();

$faqSchema = [
    '@context' => 'https://schema.org',
    '@type' => 'FAQPage',
    'mainEntity' => array_values(array_map(
        static fn($i) => ['@type' => 'Question', 'name' => $i['q'], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $i['a']]],
        array_filter($h['faq']['items'], static fn($i) => $i['a'] !== null)
    )),
];

// Scroll storytelling: the three original steps, each with a real project photo
$storyImages = [
    ['hme-aerial-white', t('home.story.1.alt'), t('home.story.1.tag')],
    ['hme-roof-panels', t('home.story.2.alt'), t('home.story.2.tag')],
    ['hme-dash-overview', t('home.story.3.alt'), t('home.story.3.tag')],
];
?>

<!-- ============================ OPENING: scroll-driven factory simulation (or photo tour, see hero-tour.php) ============================ -->
<?php
$opening = (require INC . '/data/hero-tour.php')['opening'] ?? 'simulation';
require INC . ($opening === 'tour' ? '/components/tour-hero.php' : '/components/factory-sim.php');
?>

<!-- ============================ TICKER + HIGHLIGHTS ============================ -->
<?php require INC . '/components/highlights.php'; ?>

<!-- ============================ ABOUT (editorial, layered images) ============================ -->
<section class="section sheet sheet--light" id="about" aria-labelledby="about-title">
    <div class="wrap about2">
        <div class="about2-visual">
            <figure class="about2-main reveal-mask">
                <?= img($h['about']['image'], $h['about']['image_alt'], ['sizes' => '(min-width: 900px) 42vw, 92vw', 'attrs' => ['data-parallax' => '0.06']]) ?>
            </figure>
            <figure class="about2-sub reveal-mask" style="--i: 2">
                <?= img('hme-roof-single', t('home.about.sub_alt'), ['sizes' => '(min-width: 900px) 22vw, 50vw']) ?>
            </figure>
            <div class="about2-badge reveal-scale" aria-hidden="true"><small><?= e(t('home.about.since')) ?></small><b>2022</b></div>
        </div>
        <div class="about2-copy">
            <p class="eyebrow reveal-up"><?= e($h['about']['eyebrow']) ?></p>
            <h2 id="about-title" data-split><?= e($h['about']['heading']) ?></h2>
            <p class="greet reveal-up"><a href="<?= e(url()) ?>"><?= e($h['about']['p1_link']) ?></a><?= e($h['about']['p1']) ?></p>
            <p class="reveal-up"><?= e($h['about']['p2_a']) ?><em><?= e($h['about']['p2_em']) ?></em><?= e($h['about']['p2_b']) ?></p>
            <dl class="facts reveal-up">
                <div><dt><?= e(t('home.facts.founded')) ?></dt><dd><?= e(t('home.facts.founded_v')) ?></dd></div>
                <div><dt><?= e(t('home.facts.hq')) ?></dt><dd>North Junction, Citraland, Surabaya</dd></div>
                <div><dt><?= e(t('home.facts.sectors')) ?></dt><dd><?= e(t('home.facts.sectors_v')) ?></dd></div>
                <div><dt><?= e(t('home.facts.tech')) ?></dt><dd><?= e(t('home.facts.tech_v')) ?></dd></div>
            </dl>
            <div class="cta-row reveal-up">
                <a class="btn btn-amber" href="<?= e(url('company-profile/')) ?>" data-magnetic><?= e(t('home.about.cta_profile')) ?> <?= arrow_icon() ?></a>
                <a class="btn btn-outline" href="<?= e(url('contact/')) ?>" data-magnetic><?= e(t('home.about.cta_contact')) ?></a>
            </div>
        </div>
    </div>
</section>

<!-- ============================ OUR SOLAR SOLUTIONS: interactive selector ============================ -->
<section class="section sheet sheet--white" id="solutions" aria-labelledby="solutions-title">
    <div class="wrap">
        <div class="section-head reveal-up">
            <p class="eyebrow"><?= e($h['solutions']['eyebrow']) ?></p>
            <h2 id="solutions-title" data-split><?= e($h['solutions']['heading']) ?></h2>
        </div>
        <div class="sel tabs" data-tabs>
            <div class="tab-list" role="tablist" aria-label="<?= e(t('home.selector.label')) ?>">
                <?php $i = 0; foreach ($co['selector'] as $k => $sol): ?>
                    <button class="tab" role="tab" type="button" id="tab-sel-<?= e($k) ?>" aria-controls="panel-sel-<?= e($k) ?>" aria-selected="<?= $i === 0 ? 'true' : 'false' ?>" tabindex="<?= $i === 0 ? '0' : '-1' ?>"><?= e($sol['label']) ?></button>
                <?php $i++; endforeach; ?>
            </div>
            <?php $i = 0; foreach ($co['selector'] as $k => $sol): ?>
                <div class="tab-panel sel-panel" role="tabpanel" id="panel-sel-<?= e($k) ?>" aria-labelledby="tab-sel-<?= e($k) ?>"<?= $i === 0 ? '' : ' hidden' ?> tabindex="0">
                    <figure class="sel-fig">
                        <?= img($sol['image'], $sol['alt'], ['sizes' => '(min-width: 900px) 52vw, 94vw']) ?>
                        <figcaption><?= e($sol['label']) ?></figcaption>
                    </figure>
                    <div class="sel-body">
                        <h3><?= e($sol['title']) ?></h3>
                        <p><?= e($sol['text']) ?></p>
                        <ul class="ticks"><?php foreach ($sol['points'] as $pt): ?><li><?= e($pt) ?></li><?php endforeach; ?></ul>
                        <?php if ($sol['examples']): ?>
                            <div class="sel-eg">
                                <p class="sel-eg-t"><?= e(t('home.selector.examples')) ?></p>
                                <ul><?php foreach ($sol['examples'] as [$nm, $cap]): ?><li class="pill"><?= e($nm) ?> <b><?= e($cap) ?></b></li><?php endforeach; ?></ul>
                            </div>
                        <?php endif; ?>
                        <p><a class="btn btn-amber" href="<?= e(url($sol['cta'][1])) ?>"><?= e($sol['cta'][0]) ?> <?= arrow_icon() ?></a></p>
                    </div>
                </div>
            <?php $i++; endforeach; ?>
        </div>
    </div>
</section>

<!-- ============================ THREE STEP PROCEDURE: scroll storytelling ============================ -->
<section class="section sheet sheet--navy" id="steps" aria-labelledby="steps-title">
    <div class="wrap">
        <div class="section-head reveal-up">
            <p class="eyebrow eyebrow--light"><?= e($h['steps']['eyebrow']) ?></p>
            <h2 id="steps-title" data-split><?= e($h['steps']['heading']) ?></h2>
        </div>
        <div class="story" data-story>
            <div class="story-visual" aria-hidden="true">
                <?php foreach ($storyImages as $i => [$key, $alt, $tag]): ?>
                    <figure class="story-slide<?= $i === 0 ? ' is-on' : '' ?>"><?= img($key, '', ['sizes' => '(min-width: 900px) 46vw, 90vw']) ?></figure>
                <?php endforeach; ?>
                <span class="story-visual-tag" data-story-tag><?= e($storyImages[0][2]) ?></span>
                <span class="story-visual-num" data-story-num>01</span>
            </div>
            <ol class="story-steps" data-story-steps>
                <?php foreach ($h['steps']['items'] as $i => $st): ?>
                    <li class="story-step<?= $i === 0 ? ' is-on' : '' ?>" data-step="<?= $i ?>" data-tag="<?= e($storyImages[$i][2]) ?>">
                        <div class="story-icon"><?= img($st['image'], '', ['width' => 96, 'height' => 96, 'sizes' => '96px']) ?></div>
                        <h3><?= e($st['title']) ?></h3>
                        <p><?= e($st['text']) ?></p>
                        <figure class="story-fig"><?= img($storyImages[$i][0], $storyImages[$i][1], ['sizes' => '92vw']) ?></figure>
                    </li>
                <?php endforeach; ?>
            </ol>
        </div>
    </div>
</section>

<!-- ============================ OUR SYSTEMS: interactive diagram ============================ -->
<section class="section sheet sheet--light" id="system" aria-labelledby="system-title">
    <div class="wrap">
        <div class="section-head section-head--split reveal-up">
            <div style="display:grid;gap:14px">
                <p class="eyebrow"><?= e(t('home.system.eyebrow')) ?></p>
                <h2 id="system-title" data-split><?= e(t('home.system.heading')) ?></h2>
            </div>
            <p class="lead"><?= e(t('home.system.lead')) ?></p>
        </div>
        <?php require INC . '/components/system-explorer.php'; ?>
    </div>
</section>

<!-- ============================ FEATURED SOLAR PROJECTS ============================ -->
<section class="section sheet sheet--ink" id="projects" aria-labelledby="projects-title">
    <div class="wrap">
        <div class="section-head section-head--split reveal-up">
            <div style="display:grid;gap:14px">
                <p class="eyebrow eyebrow--light"><?= e($h['projects']['eyebrow']) ?></p>
                <h2 id="projects-title" data-split><?= e($h['projects']['heading']) ?></h2>
            </div>
            <p class="lead"><?= e(t('home.projects.lead')) ?></p>
        </div>
        <?php require INC . '/components/project-showcase.php'; ?>
    </div>
</section>

<!-- ============================ SERVICES ============================ -->
<section class="section sheet sheet--light" id="services" aria-labelledby="services-title">
    <div class="wrap">
        <div class="section-head reveal-up">
            <p class="eyebrow"><?= e(t('services.eyebrow')) ?></p>
            <h2 id="services-title" data-split><?= e(t('services.heading')) ?></h2>
        </div>
        <ul class="svc" data-stagger>
            <?php foreach ($co['services'] as $sv): ?>
                <li class="reveal-up stagger-item">
                    <a class="svc-row" href="<?= e(url('products/#layanan')) ?>">
                        <span class="svc-code" aria-hidden="true"><?= e($sv['code']) ?></span>
                        <h3><?= e($sv['title']) ?></h3>
                        <p><?= e($sv['text']) ?></p>
                        <span class="svc-go" aria-hidden="true"><?= arrow_icon() ?></span>
                    </a>
                </li>
            <?php endforeach; ?>
        </ul>
    </div>
</section>

<!-- ============================ MISSION / VISION / GOAL ============================ -->
<section class="section sheet band" id="mission" aria-label="<?= e(t('home.mission.section')) ?>">
    <div class="wrap">
        <div class="tabs" data-tabs>
            <div class="tab-list" role="tablist" aria-label="<?= e(t('home.mission.tabs')) ?>">
                <?php foreach ($h['tabs'] as $i => $t): ?>
                    <button class="tab" role="tab" type="button" id="tab-<?= e($t['id']) ?>" aria-controls="panel-<?= e($t['id']) ?>"
                        aria-selected="<?= $i === 0 ? 'true' : 'false' ?>" tabindex="<?= $i === 0 ? '0' : '-1' ?>"><?= e($t['label']) ?></button>
                <?php endforeach; ?>
            </div>
            <?php foreach ($h['tabs'] as $i => $t): ?>
                <div class="tab-panel" role="tabpanel" id="panel-<?= e($t['id']) ?>" aria-labelledby="tab-<?= e($t['id']) ?>"<?= $i === 0 ? '' : ' hidden' ?> tabindex="0">
                    <figure class="tab-media"><?= img($t['image'], $t['alt'], ['sizes' => '(min-width: 900px) 50vw, 100vw']) ?></figure>
                    <ul class="hex-list">
                        <?php foreach ($t['items'] as $n => $item): ?>
                            <li><span class="hex hex--num" aria-hidden="true"><?= $n + 1 ?></span><span><?= e($item) ?></span></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- ============================ ADVANTAGES + WHY CHOOSE US: bento ============================ -->
<section class="section sheet sheet--white" id="advantages" aria-labelledby="adv-title">
    <div class="wrap">
        <div class="section-head reveal-up">
            <p class="eyebrow"><?= e($h['advantages']['eyebrow']) ?></p>
            <h2 id="adv-title" data-split><?= e($h['advantages']['heading']) ?></h2>
        </div>
        <div class="bento" data-stagger>
            <?php $adv = $h['advantages']['cards']; ?>
            <article class="bn bn-hero reveal-scale stagger-item">
                <div>
                    <span class="bn-pre"><?= e(t('home.adv.up_to')) ?></span><p class="bn-num" data-count="50" data-suffix="%">50%</p>
                    <h3><?= e($adv[0]['title']) ?></h3>
                </div>
                <div>
                    <p><?= e($adv[0]['text']) ?></p>
                    <small><?= e(t('home.adv.disclaimer')) ?></small>
                </div>
            </article>
            <?php foreach (array_slice($adv, 1) as $card): ?>
                <article class="bn bn-card card reveal-scale stagger-item">
                    <div class="benefit-icon"><?= img($card['image'], '', ['width' => 96, 'height' => 96, 'sizes' => '96px']) ?></div>
                    <h3><?= e($card['title']) ?></h3>
                    <p><?= e($card['text']) ?></p>
                </article>
            <?php endforeach; ?>
            <article class="bn bn-why reveal-scale stagger-item">
                <h3 id="why-title"><?= e($h['why']['heading']) ?></h3>
                <p class="lead"><?= e($h['why']['lead']) ?></p>
                <ul class="chips" data-rotator>
                    <?php foreach ($h['why']['items'] as $i => $w): ?>
                        <li<?= $i === 0 ? ' class="is-on"' : '' ?>><span class="hex hex--sm" aria-hidden="true"></span><?= e($w) ?></li>
                    <?php endforeach; ?>
                </ul>
            </article>
            <article class="bn bn-warranty reveal-scale stagger-item">
                <h3><?= e(t('home.warranty.title')) ?></h3>
                <ul>
                    <li><b><?= e(t('home.warranty.1.value')) ?></b><span><?= e(t('home.warranty.1.label')) ?></span></li>
                    <li><b><?= e(t('home.warranty.2.value')) ?></b><span><?= e(t('home.warranty.2.label')) ?></span></li>
                    <li><b><?= e(t('home.warranty.3.value')) ?></b><span><?= e(t('home.warranty.3.label')) ?></span></li>
                </ul>
            </article>
        </div>
    </div>
</section>

<!-- ============================ CLIENTS + BRANDS ============================ -->
<section class="section sheet sheet--light" id="clients" aria-labelledby="clients-title">
    <div class="wrap">
        <div class="section-head reveal-up">
            <p class="eyebrow"><?= e(t('home.clients.eyebrow')) ?></p>
            <h2 id="clients-title" data-split><?= e(t('home.clients.heading')) ?></h2>
        </div>
    </div>
    <?php require INC . '/components/logos.php'; ?>
</section>

<!-- ============================ FAQ ============================ -->
<section class="section sheet sheet--white faq-wrap" id="faq" aria-labelledby="faq-title">
    <?php require INC . '/components/faq.php'; ?>
    <?= json_ld($faqSchema) . "\n" ?>
</section>

<!-- ============================ CALL TO ACTION ============================ -->
<?php $cta = ['heading' => $h['cta']['heading'], 'button' => $h['cta']['button']]; require INC . '/components/cta-visual.php'; ?>

<!-- ============================ QUOTE ============================ -->
<section class="section quote band" id="penawaran" aria-labelledby="quote-title">
    <div class="wrap quote-grid">
        <div class="quote-copy reveal-left">
            <figure class="quote-media"><?= img($h['quote']['image'], $h['quote']['alt'], ['sizes' => '(min-width: 900px) 40vw, 80vw']) ?></figure>
            <h2 id="quote-title"><?= e($h['quote']['heading']) ?></h2>
            <p class="lead"><?= e($h['quote']['text']) ?></p>
        </div>
        <div class="form-card reveal-right">
            <h3 class="form-title"><?= e(t('home.quote.form_title')) ?></h3>
            <?php render_form('quote', ['prefix' => 'quote', 'return' => 'home']); ?>
        </div>
    </div>
</section>

<!-- ============================ OFFER POP-UP ============================ -->
<dialog class="offer" id="offer-dialog" aria-labelledby="offer-title" data-offer>
    <div class="offer-inner">
        <button type="button" class="offer-close" data-close><?= e($h['popup']['close']) ?></button>
        <h2 id="offer-title" class="offer-title"><?= e($h['popup']['p1']) ?></h2>
        <p><?= e($h['popup']['p2']) ?></p>
        <p><?= e($h['popup']['p3']) ?></p>
        <?php render_form('detail', ['prefix' => 'offer', 'return' => 'home']); ?>
    </div>
</dialog>
