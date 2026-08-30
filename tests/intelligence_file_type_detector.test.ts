import test from 'node:test';
import assert from 'node:assert/strict';
import { detectFileType, extensionOf, sniffMagicBytes } from '../server/intelligence/ingestion/fileTypeDetector';

test('extensionOf handles dotted names and none', () => {
  assert.equal(extensionOf('GLA NRO Workbook.pdf'), 'pdf');
  assert.equal(extensionOf('archive.tar.gz'), 'gz');
  assert.equal(extensionOf('noext'), '');
});

test('sniffMagicBytes recognizes PDF and PNG signatures', () => {
  assert.equal(sniffMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46])), 'pdf');
  assert.equal(sniffMagicBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), 'png');
  assert.equal(sniffMagicBytes(new Uint8Array([0x50, 0x4b, 0x03, 0x04])), 'zip-office');
});

test('detectFileType prefers sniffed content over extension', () => {
  // Bytes are a real PDF but filename claims .png (spoofed extension).
  const det = detectFileType({
    filename: 'photo.png',
    declaredMime: 'image/png',
    bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
  });
  assert.equal(det.format, 'pdf');
  assert.equal(det.family, 'pdf');
  assert.equal(det.mimeMismatch, true);
});

test('detectFileType disambiguates zip-based office by extension', () => {
  const det = detectFileType({
    filename: 'roster.xlsx',
    bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  });
  assert.equal(det.format, 'xlsx');
  assert.equal(det.family, 'spreadsheet');
});
