<?php
/** English page titles / descriptions / breadcrumbs (base: includes/data/pages.php). */
$name = cfg('site_name');

return [
    '' => ['meta' => [
        'title' => 'PT Hexa Multi Energi Surabaya - Solar Power Plants (PLTS) in Surabaya - Solar Panels',
        'description' => 'A company specialising in renewable energy consulting and installation. Solar PV (PLTS) in Surabaya, serving the Citraland Surabaya area.',
    ]],
    'products' => ['meta' => [
        'title' => 'Products - ' . $name,
        'description' => 'Residential, Commercial & Industrial Solar: lower electricity bills, long-term cost reduction, clean renewable energy, and higher property value with solar PV.',
        'crumbs' => [['Home', ''], ['Products', 'products/']],
    ]],
    'contact' => ['meta' => [
        'title' => 'Contact - ' . $name,
        'description' => 'Contact Hexa Multi Energi for a free consultation on On-Grid, Off-Grid, and Hybrid solar panel (PLTS) installation in Surabaya.',
        'crumbs' => [['Home', ''], ['Contact', 'contact/']],
    ]],
    'newsblog' => ['meta' => [
        'title' => 'News & Blog - ' . $name,
        'description' => 'Articles and news about solar PV: how to choose a solar panel contractor, rooftop solar permit requirements, solar rental systems, and inverter maintenance tips.',
        'crumbs' => [['Home', ''], ['News & Blog', 'newsblog/']],
    ]],
    'career' => ['meta' => [
        'title' => 'Careers - ' . $name,
        'description' => 'Join the PT Hexa Multi Energi team. See our open positions and send us your application.',
        'crumbs' => [['Home', ''], ['Careers', 'career/']],
    ]],
    'company-profile' => ['meta' => [
        'title' => 'Company Profile - ' . $name,
        'description' => 'The official PT Hexa Multi Energi company profile: open the interactive presentation or download the company profile document.',
        'crumbs' => [['Home', ''], ['Company Profile', 'company-profile/']],
    ]],
];
