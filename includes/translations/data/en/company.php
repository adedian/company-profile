<?php
/** English text for includes/data/company.php. Names of clients, brands and projects are kept as they are. */
return [
    'highlights' => [
        ['label' => 'Founded in November', 'note' => 'Based in Citraland, Surabaya'],
        ['label' => 'Installed solar PV capacity', 'note' => 'Total industrial projects in our portfolio: 10.26 MWp'],
        ['suffix' => ' systems', 'label' => 'On-Grid, Off-Grid, Hybrid', 'note' => 'Chosen to suit the needs of each building'],
        ['prefix' => 'up to ', 'label' => 'Savings on monthly electricity bills', 'note' => 'HME Company Profile statement; actual results depend on the load profile'],
    ],

    'selector' => [
        'residential' => [
            'label' => 'Residential',
            'alt' => 'Residential solar installation by PT Hexa Multi Energi',
            'text' => 'Reduce your electricity bill by using solar power generation in Surabaya.',
            'points' => ['Lower your home electricity bill', 'Long-term electricity cost reduction', 'Renewable & eco-friendly energy source', 'Increase the value of your property'],
            'cta' => ['View Products'],
        ],
        'commercial' => [
            'label' => 'Commercial',
            'alt' => 'Commercial solar installation at PT Boncafe Sejahtera',
            'text' => 'Solar PV solutions for the commercial sector.',
            'points' => ['End-to-end service: system design, installation, performance monitoring, through to O&M', 'System tailored to your electricity consumption profile', 'Outright purchase or rental (rent-to-own)'],
            'examples' => [['Hotel Azana Style', '44.2 kWp'], ['PT Boncafe Sejahtera', '15.2 kWp'], ['Zhang Palace', '15 kWp'], ['PT Indrayasa Migasa', '7 kWp']],
            'cta' => ['Discuss a commercial project'],
        ],
        'industrial' => [
            'label' => 'Industrial',
            'alt' => 'Industrial solar installation at PT Mitra Saruta Indonesia',
            'text' => 'Solar PV solutions for the industrial sector.',
            'points' => ['End-to-end service: system design, installation, performance monitoring, through to O&M', 'Performance monitoring from anywhere', 'Outright purchase or rental (rent-to-own)'],
            'examples' => [['PT Mitra Saruta Indonesia', '3 MWp'], ['PT Pei Hai International (Phase 2)', '2.26 MWp'], ['PT Inkasa Jaya Aluminium', '1.9 MWp'], ['PT Setia Kawan Makmur Sejahtera (Phase 1)', '1.59 MWp']],
            'cta' => ['Discuss an industrial project'],
        ],
    ],

    'portfolio' => [
        ['cap' => '3 MWp'],
        ['short' => 'Pei Hai · Phase 2', 'cap' => '2.26 MWp'],
        ['cap' => '1.9 MWp'],
        ['short' => 'Setia Kawan · Phase 1', 'cap' => '1.59 MWp'],
        ['short' => 'Pei Hai · Phase 1', 'cap' => '1.51 MWp'],
        ['cap' => '44.2 kWp'],
        ['cap' => '15.2 kWp'],
        ['cap' => '15 kWp'],
        ['cap' => '7 kWp'],
        ['name' => 'Residential 1', 'short' => 'Residential', 'cap' => 'Residential'],
        ['name' => 'Residential 2', 'short' => 'Residential', 'cap' => 'Residential'],
        ['name' => 'Residential 3', 'short' => 'Residential', 'cap' => 'Residential'],
    ],

    'systems' => [
        'ongrid' => [
            'tag' => 'Solar panels + PLN grid', 'source' => 'Solar panels + PLN grid', 'battery' => 'None',
            'outage' => 'The inverter shuts down automatically; the building loses power too',
            'fit' => 'Reduces electricity bills. Example products: Home Solution and solar canopy',
        ],
        'offgrid' => [
            'tag' => 'Solar panels + battery', 'source' => 'Solar panels + battery', 'battery' => 'Yes, the main source at night',
            'outage' => 'Unaffected, does not use the PLN grid',
            'fit' => 'Remote areas or areas with an unstable power grid',
        ],
        'hybrid' => [
            'tag' => 'Solar panels + battery + PLN grid', 'source' => 'Solar panels + battery + PLN grid', 'battery' => 'Yes, stores excess solar energy',
            'outage' => 'Switches to the battery, loads stay on',
            'fit' => 'Reliable supply, less dependent on conventional electricity',
        ],
    ],

    'components' => [
        'panel'    => ['Solar panel', 'Converts sunlight into direct current (DC) electricity. The modules we use come from global Tier-1 manufacturers.'],
        'inverter' => ['Inverter', 'Converts the DC power from the panels into the AC power used by equipment, and manages how the system works together with the PLN grid or the battery.'],
        'battery'  => ['Battery', 'Stores solar energy for use at night or during a PLN outage (in Off-Grid and Hybrid systems).'],
        'dist'     => ['Distribution panel', 'Distributes power from the inverter to the loads of the building or factory through the low-voltage distribution panel (LVMDP).'],
        'load'     => ['Load', 'The equipment, machinery, and lighting that use electricity. The more electricity is used during the day, the more solar energy is used directly.'],
        'grid'     => ['PLN grid', 'In On-Grid and Hybrid systems, PLN power supports solar energy so the load demand is always met.'],
        'monitor'  => ['Monitoring', 'Monitors the production and performance of the system from anywhere, so the PV system keeps performing at its best.'],
    ],

    'services' => [
        ['text' => 'A complete package: system design, material procurement, and PV construction, so quality is maintained and work is completed on time.'],
        ['text' => 'Professional installation, regular maintenance, and a monitoring system so the efficiency and performance of the PV system stay optimal.'],
        ['text' => 'Energy needs analysis, system simulation, technical and financial evaluation, and regulatory guidance.'],
    ],

    'schemes' => [
        [
            'title' => 'Full Purchase', 'lead' => 'Pay once, yours from day one',
            'text' => 'The customer pays once to buy the PV system outright. You enjoy a lower electricity bill right away and may be eligible for tax incentives.',
            'pros' => ['Savings on your energy bill are felt immediately', 'Potentially faster return on investment (ROI)', 'Greater control over upgrades and maintenance'],
            'cons' => ['Higher upfront capital expenditure', 'Full responsibility for operation and maintenance (O&M), although HME provides complete O&M services'],
        ],
        [
            'title' => 'Rental (Rent-to-Own)', 'lead' => 'No upfront investment, ownership at the end of the contract',
            'text' => 'Set a contract term of 15 to 25 years and get a fixed discount off the PLN tariff, so electricity is more affordable.',
            'pros' => ['Zero investment', 'Lower technical risk because operation and maintenance are handled by the Developer/Investor', 'Option to own the system at the end of the contract'],
            'cons' => ['Two electricity bills (PLN and the Developer)', 'A 15 to 25 year contract', 'Ownership transfers only if the contract terms are met'],
        ],
    ],

    'benefits' => [
        ['Well Known Brand', 'Tier-1 photovoltaic modules and globally trusted inverter manufacturers, for proven performance, investment security, and long-term operational stability.'],
        ['Efficiency and Savings', 'Our solutions help reduce your electricity bill by up to 50% every month.'],
        ['Environmental Commitment', 'Using renewable energy to reduce carbon emissions and contribute to a cleaner, greener future.'],
        ['Guaranteed Quality', 'All products are certified with service and maintenance warranties, ensuring long-lasting performance.'],
    ],
];
