import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

// Schematic graphics for development. No satellite imagery or scientific measurements.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data')
const folder = resolve(root, 'synthetic-tonle-sap')
mkdirSync(folder, { recursive: true })
const size = 768
function crc32(buffer) {
  let crc = -1
  for (const byte of buffer) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ -1) >>> 0
}
function chunk(type, data) {
  const name = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4)
  length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, crc])
}
function inWater(u, v, expanded) {
  const channel = .42 + .11 * Math.sin(v * 7) + .06 * Math.sin(v * 18)
  return ((u - .28) / (expanded ? .38 : .28)) ** 2 + ((v - .16) / .43) ** 2 < 1 || Math.abs(u - channel) < (expanded ? .075 : .035) + .015 * Math.sin(v * 11)
}
function png(name, expanded, change = false) {
  const pixels = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    const offset = y * (size * 4 + 1); pixels[offset] = 0
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size, wet = inWater(u, v, expanded)
      const field = (Math.floor(x / 29) * 13 + Math.floor(y / 24) * 7) % 22
      let rgba = wet ? [37, 118 + Math.round(v * 25), 142 + Math.round(v * 18), 235] : [44 + field, 65 + field, 61 + field, 190]
      if ((x % 29 < 1 || y % 24 < 1) && !wet) rgba = [98, 124, 109, 130]
      if (change) rgba = inWater(u, v, true) && !inWater(u, v, false) ? [92, 223, 234, 190] : [0, 0, 0, 0]
      if (x < 8 || x >= size - 8 || y < 8 || y >= size - 8) rgba[3] = 0
      rgba.forEach((c, channel) => { pixels[offset + 1 + x * 4 + channel] = c })
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6
  writeFileSync(resolve(folder, name), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]))
}
png('before.png', false); png('after.png', true); png('change.png', true, true)
const coordinates = [[104, 12.95], [104.5, 12.95], [104.5, 12.55], [104, 12.55]]
const manifest = {
  schemaVersion: 1, id: 'synthetic-tonle-sap', title: 'Tonle Sap study window', location: 'Cambodia · illustrative location',
  description: 'A schematic study window for exploring the interface while the data team prepares real observations.',
  dataKind: 'synthetic-demo', interpretation: 'radar-response-change', reviewStatus: 'unreviewed',
  instrument: 'None — synthetic development graphics', product: 'Schematic PNG display fixture', measurement: 'Illustrative color categories', units: 'Not a scientific measurement',
  method: 'Deterministic geometric shapes generated for interface testing. No SAR processing, detection, or environmental analysis has been performed.',
  bounds: [104, 12.55, 104.5, 12.95], coordinates,
  coverage: { type: 'Feature', properties: { meaning: 'Synthetic display footprint, not validated observation coverage' }, geometry: { type: 'Polygon', coordinates: [[...coordinates, coordinates[0]]] } },
  before: { label: 'Example frame A', date: '2026-10-01T00:00:00Z', image: '/data/synthetic-tonle-sap/before.png', inputId: 'synthetic-frame-a' },
  after: { label: 'Example frame B', date: '2026-10-13T00:00:00Z', image: '/data/synthetic-tonle-sap/after.png', inputId: 'synthetic-frame-b' },
  change: { image: '/data/synthetic-tonle-sap/change.png', label: 'Schematic added shape — not detected inundation' },
  legend: [{ label: 'Example water', color: '#258a9e' }, { label: 'Example land', color: '#526951' }],
  observed: 'Two schematic views illustrate how a prepared observation pair will appear. Shapes and differences were deliberately drawn for this development example.',
  explanation: 'Use the divider or Before and After controls to inspect the pair. The brighter example overlay is a drawn shape, not a detected flood or a radar-derived measurement.',
  limitations: ['No real NISAR acquisitions are included.', 'Dates and viewpoints are illustrative; this is not a confirmed flood case.', 'Seasonal inundation and damaging flooding require independent contextual evidence.'],
  sources: [{ title: 'NISAR Data User Guide — background reference', url: 'https://nisar-docs.asf.alaska.edu/' }, { title: 'Dancing with the SARs — official challenge', url: 'https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/' }],
  story: [
    { title: 'Start with a place.', body: 'This illustrative window is positioned near Tonle Sap. Its rectangle demonstrates how actual observation coverage will be displayed. The study area is not finalized.', center: [104.25, 12.75], zoom: 9.5, view: 'before' },
    { title: 'Look across two moments.', body: 'Slide between these schematic frames to try the comparison. Real observations must use compatible measurements, geometry, and display settings before differences can be interpreted.', center: [104.24, 12.75], zoom: 10, view: 'compare' },
    { title: 'Leave room for uncertainty.', body: 'A difference starts an investigation. Supporting evidence is needed to distinguish seasonal water patterns from flooding. This development case makes no environmental finding.', center: [104.31, 12.72], zoom: 10.3, view: 'after' },
  ],
}
writeFileSync(resolve(folder, 'case.json'), JSON.stringify(manifest, null, 2) + '\n')
writeFileSync(resolve(root, 'index.json'), JSON.stringify({ cases: [{ id: manifest.id, title: manifest.title, location: manifest.location, manifest: '/data/synthetic-tonle-sap/case.json', dataKind: manifest.dataKind }] }, null, 2) + '\n')
console.log('Created labeled synthetic fixture. No satellite data used.')
