"""Import data only from the teammate archive; never execute its JS/Python/UI.

Requires Pillow. Run from frontend: python scripts/import-webapp-data.py ../../webapp.zip
The default prefers webapp2.zip, then webapp.zip in the workspace root. Originals stay in the ZIP.
"""
from pathlib import Path, PurePosixPath
from zipfile import ZipFile
from io import BytesIO
import hashlib
import json
import re
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else next((ROOT.parents[1] / name for name in ['webapp2.zip', 'webapp.zip'] if (ROOT.parents[1] / name).exists()), ROOT.parents[1] / 'webapp.zip')
DEST = ROOT / 'public/data/tonle-sap-2026'


def digest(value):
    return hashlib.sha256(value).hexdigest()


def write_json(name, value):
    (DEST / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def main():
    with ZipFile(ARCHIVE) as archive:
        files = {item.filename: item for item in archive.infolist() if not item.is_dir()}
        if len(files) != len([i for i in archive.infolist() if not i.is_dir()]):
            raise ValueError('Duplicate archive entries')
        if sum(i.file_size for i in files.values()) > 50_000_000:
            raise ValueError('Archive exceeds this bounded import budget')
        raw = archive.read('webapp/data/data.js')
        match = re.fullmatch(r'\s*//[^\n]*\nwindow\.APP_DATA\s*=\s*(\{.*\});\s*', raw.decode('utf-8'), re.S)
        if not match:
            raise ValueError('Expected a JSON object assigned to APP_DATA, not executable data')
        data = json.loads(match[1])
        dates = data['summary']['dates']
        if dates != sorted(set(dates)) or len(dates) < 2:
            raise ValueError('Expected chronological unique dates')
        bounds = data['layers']['change']['bounds']
        south, west = bounds[0]
        north, east = bounds[1]
        records = []
        DEST.mkdir(parents=True, exist_ok=True)

        def image(relative, placement):
            path = PurePosixPath(relative)
            if placement != bounds or not re.fullmatch(r'data/[a-z0-9_]+\.png', relative):
                raise ValueError('Unexpected image placement/path')
            payload = archive.read('webapp/' + relative)
            source = Image.open(BytesIO(payload))
            source.load()
            if source.mode != 'RGBA' or max(source.size) > 4096:
                raise ValueError('Unexpected export image')
            original_size = source.size
            if max(source.size) > 2048:
                ratio = 2048 / max(source.size)
                size = tuple(round(d * ratio) for d in source.size)
                # These are display derivatives only; do not recalculate class areas.
                source = source.resize(size, Image.Resampling.NEAREST)
                buffer = BytesIO()
                source.save(buffer, format='PNG', optimize=True)
                display = buffer.getvalue()
            else:
                display = payload
            (DEST / path.name).write_bytes(display)
            records.append({'archivePath': 'webapp/' + relative, 'sourceSha256': digest(payload),
                            'displayPath': '/data/tonle-sap-2026/' + path.name,
                            'displaySha256': digest(display), 'sourceDimensions': original_size,
                            'displayDimensions': source.size})
            return '/data/tonle-sap-2026/' + path.name

        observations = []
        for date in dates:
            entry = data['dates'][date]
            observations.append({'date': date, 'image': image(entry['water'], entry['water_bounds']),
                                 'radarImage': image(entry['sar'], entry['sar_bounds']),
                                 'inputId': 'Team export ' + PurePosixPath(entry['water']).name,
                                 **({'unusualImage': image(entry['unusual'], entry['unusual_bounds'])} if entry.get('unusual') else {})})
        water_legend = [{'label': 'Team class: open water', 'color': '#2563eb'},
                        {'label': 'Team class: flooded vegetation', 'color': '#16a34a'}]
        change_legend = [{'label': 'Team class: water gained', 'color': '#2563eb'},
                         {'label': 'Team class: water lost', 'color': '#dc2626'}]
        definitions = [
            ('frequency', 'Water-class frequency', 'Fraction across the 11 supplied dates, not a continuous flood-duration record.',
             [{'label': 'Low frequency', 'color': '#bae6fd'}, {'label': 'High frequency', 'color': '#172554'}]),
            ('water_class', 'Permanent / seasonal classes', 'Team season-wide water categories. Permanent means within the supplied sample only.',
             [{'label': 'Team class: seasonal', 'color': '#7dd3fc'}, {'label': 'Team class: permanent', 'color': '#1e3a8a'}]),
            ('change', 'First-to-last water change', 'Team classification change between 19 June and 29 October only; not change for any selected intermediate pair.', change_legend),
        ]
        layers = [{'id': id, 'label': label, 'description': description,
                   'image': image(data['layers'][id]['file'], data['layers'][id]['bounds']), 'legend': legend}
                  for id, label, description, legend in definitions]
        exposure = None
        if data.get('impact'):
            meta = data.get('impact_meta') or {}
            def values(row, prefix):
                return {key: row.get(prefix + name) for key, name in
                        [('areaKm2', 'km2'), ('population', 'people'), ('roadKm', 'road_km'), ('croplandHa', 'crop_ha')]}
            exposure = {
                'records': [{'date': date, 'classifiedWater': values(data['impact'][date], 'flooded_'),
                             'baselineFiltered': values(data['impact'][date], 'unusual_')}
                            for date in dates if date in data['impact']],
                'sources': {'population': meta.get('population') or [], 'cropland': meta.get('cropland') or [],
                            'cropClass': meta.get('crop_class'), 'roads': meta.get('roads'), 'roadsFilter': meta.get('roads_filter'),
                            'baseline': meta.get('baseline'), 'recurrenceBelowPct': meta.get('unusual_below_pct'),
                            'method': 'Archive README reports intersections with WorldPop population, OSM drivable roads and WorldCover cropland class 40. Baseline-filtered output uses open water where historical JRC recurrence is below the supplied threshold; flooded vegetation is excluded. impact.py, input exposure rasters/vectors, baseline nodata handling and validation evidence were not supplied. This is a screening proxy, not a season-matched anomaly or an operational alert.'},
            }
        write_json('source-metadata.json', data)
        write_json('provenance.json', {
            'archive': ARCHIVE.name, 'archiveSha256': digest(ARCHIVE.read_bytes()),
            'metadataSha256': digest(raw), 'exporterSha256': digest(archive.read('webapp/export_web.py')),
            'status': 'Team-provided derived exports; source products and scientific validation not verified',
            'reportedInstrument': 'NISAR L-band, as stated in the archive README',
            'reportedDistributor': 'ASF, reported by the user on behalf of the data teammate on 2026-11-14; exact catalog records not supplied',
            'missing': ['Original product/granule IDs', 'polarization and calibrated units', 'acquisition timestamps',
                        'sar_insights.py and threshold configuration', 'impact.py and exposure/baseline source files', 'valid-data/support masks',
                        'independent validation evidence', 'redistribution terms'],
            'spatialContext': 'Supplied exporter specifies EPSG:3857; geographic bounds copied from data.js. Native GeoTIFFs absent.',
            'displayPreparation': 'PNG only. Nearest-neighbor resize to <=2048 pixels on longest side; no class-area calculations. Radar PNG bytes retained.',
            'files': records,
            **({'comparedWithArchive': {'name': 'webapp.zip', 'sha256': digest((ROOT.parents[1] / 'webapp.zip').read_bytes())}} if ARCHIVE.name != 'webapp.zip' and (ROOT.parents[1] / 'webapp.zip').exists() else {}),
        })
        first, last = observations[0], observations[-1]
        manifest = {
            'schemaVersion': 1, 'id': 'tonle-sap-2026', 'title': 'Tonlé Sap · 2026 team exports',
            'location': 'Cambodia · Tonlé Sap export extent', 'dataKind': 'team-export',
            'interpretation': 'possible-inundation', 'reviewStatus': 'unreviewed',
            'description': 'Eleven dated water-classification and radar-display exports supplied by the data team, June–October 2026. Source provenance and scientific review remain pending.',
            'instrument': 'Reported NISAR L-band; original products not supplied',
            'product': 'Team-derived PNG display layers; original product level, version and polarization unknown',
            'measurement': 'Team-classified water categories', 'units': 'Unreviewed categories',
            'method': 'The supplied export_web.py specifies UTM-to-EPSG:3857 reprojection, nearest-neighbor category export, and 8-bit grayscale radar display. The analysis script, thresholds, calibration, alignment evidence and valid-support mask were not supplied. This integration converts the data wrapper to JSON and makes bounded PNG display derivatives; it performs no SAR analysis or area calculation.',
            'bounds': [west, south, east, north], 'coordinates': [[west, north], [east, north], [east, south], [west, south]],
            'coverageType': 'display-extent',
            'coverage': {'type': 'Feature', 'properties': {'meaning': 'Supplied rectangular export bounds, not validated analysis support'},
                         'geometry': {'type': 'Polygon', 'coordinates': [[[west, south], [east, south], [east, north], [west, north], [west, south]]]}},
            'before': {**{key: first[key] for key in ['date', 'image', 'inputId']}, 'label': 'Water classes · ' + first['date']},
            'after': {**{key: last[key] for key in ['date', 'image', 'inputId']}, 'label': 'Water classes · ' + last['date']},
            'change': {'image': layers[-1]['image'], 'label': 'First-to-last team water change', 'legend': change_legend},
            'legend': water_legend,
            'observed': 'The supplied classification PNGs contain blue open-water and green flooded-vegetation categories. These are team-generated classes, not independently confirmed flood detections. Radar views are pre-rendered 8-bit grayscale, not calibrated measurements.',
            'explanation': 'Compare the same display type across supplied dates. Transparent pixels do not distinguish unclassified land from invalid or unobserved areas. The separate change layer applies only to the first and last dates. Season maps summarize the sampled dates only.',
            'limitations': ['The team reports ASF as the download source and NISAR L-band in the archive README; exact product identifiers remain unverified.',
                           'Only date labels are supplied; exact acquisition times and time zone are unknown.',
                           'No original rasters, detector thresholds, polarization, calibrated units or independent validation were included.',
                           'Export bounds are not proof of valid observation support; transparency also includes background and missing data.',
                           'Area figures are imported team estimates, not reproduced or independently validated. Open-water area differs from total classified area.',
                           'No deforestation inference is imported: the archive explicitly skips it without a comparable earlier-year baseline.',
                           'Data-use and redistribution terms require clarification before public release.'],
            'sources': [{'title': 'ASF Data Search — download service reported by the team; exact records pending', 'url': 'https://search.asf.alaska.edu/'}], 'story': [], 'provenance': '/data/tonle-sap-2026/provenance.json',
            'collection': {'observations': observations, 'layers': layers, 'series': data['series'], **({'exposure': exposure} if exposure else {})},
        }
        if exposure:
            manifest['description'] = 'Eleven dated team exports with reported population, road and cropland overlap estimates and a historical-recurrence-filtered open-water proxy. Source products and scientific review remain pending.'
            manifest['limitations'].extend([
                'Exposure figures are team estimates, not confirmed affected people, closed roads, crop damage or rice-specific losses. WorldCover class 40 is cropland.',
                'Baseline-filtered water uses the reported JRC v1.4 recurrence reference ending in 2021; it is not a month-matched seasonal anomaly. The provider now deprecates v1.4.',
                'Population source filename refers to 2025; land-cover files refer to 2021. OSM snapshot date and exposure processing/validation are not supplied.',
                'The orange proxy includes open water only, not water beneath vegetation. No baseline source raster or valid-data mask is included to check missing-data handling.',
            ])
            manifest['sources'].extend([
                {'title': 'WorldPop — population source reported in archive', 'url': 'https://hub.worldpop.org/'},
                {'title': 'ESA WorldCover — cropland source reported in archive', 'url': 'https://esa-worldcover.org/en/data-access'},
                {'title': 'OSM / Geofabrik — roads source reported in archive', 'url': 'https://download.geofabrik.de/asia/cambodia.html'},
                {'title': 'JRC Global Surface Water — baseline data and version notes', 'url': 'https://global-surface-water.appspot.com/download'},
            ])
        write_json('case.json', manifest)
        index_path = ROOT / 'public/data/index.json'
        index = json.loads(index_path.read_text(encoding='utf-8'))
        entry = {key: manifest[key] for key in ['id', 'title', 'location', 'dataKind']}
        entry['manifest'] = '/data/tonle-sap-2026/case.json'
        index['cases'] = [entry] + [item for item in index['cases'] if item['id'] != entry['id']]
        index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        print(f'Imported {len(observations)} dates and {len(layers)} season layers; UI and bundled libraries excluded.')


if __name__ == '__main__':
    main()
