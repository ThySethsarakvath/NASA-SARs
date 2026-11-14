# Globe context assets

Retrieved 2026-11-14. These assets provide illustrative global context. They do not establish NISAR acquisition coverage, current conditions, a flood event, environmental change, or analysis validity.

## NASA Blue Marble texture

- Source page: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/
- Original source: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/july/world.topo.bathy.200407.3x5400x2700.jpg
- Downloaded display derivative: https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/bmng/bmng-topography-bathymetry/july/world.topo.bathy.200407.3x5400x2700.jpg?w=2048&h=1024&fit=clip
- Credit: NASA Earth Observatory; Blue Marble: Next Generation, produced by Reto Stöckli.
- Historical period: July 2004 composite, with topography and bathymetry.
- Local file: ../images/earth-blue-marble.jpg, 2048 x 1024, 247716 bytes.
- SHA-256: `0ac581545094c19b4cf8800006c07d9a73e327c9eb9bae28a07c9edc17429f4a`.
- Usage guidance: https://www.nasa.gov/nasa-brand-center/images-and-media/
- Rendering: a grayscale charcoal shader, illustrative lighting/rim, and a highlighted geographic Cambodia border. No real-time Earth view or scientific classification is claimed. Original downloaded JPEG pixels are unchanged.

## Natural Earth outlines

- Source: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
- Source repository: https://github.com/nvkelso/natural-earth-vector
- Terms: https://www.naturalearthdata.com/about/terms-of-use/ (public domain).
- Local file: boundaries.json; country polygon rings extracted, properties omitted, coordinates rounded to three decimals. Source is 1:110 million generalized cartography; borders are not authoritative survey data.
- SHA-256: `5e60d639981269561ec9603a963745f2df0102b7b053f557201edbbeab04c68b`.
- Cambodia highlight: cambodia.json extracts only the feature with ADM0_A3=KHM from the same source; exterior ring coordinates are rounded to three decimals. 370 bytes. SHA-256: `3cdbd6b7cec7679ffe43df62ebce695ad3100bc20f836dd58f8f51a0e077e1a9`. Retrieved 2026-11-14. This generalized border is contextual, not an authoritative boundary or study footprint.
- Runtime: line segments are densified on the sphere to avoid chords clipping beneath the globe. This is presentation geometry, not environmental analysis.

The homepage's landscape and portrait records are in ../images/CREDITS.md. No NASA or data-provider endorsement is implied.
