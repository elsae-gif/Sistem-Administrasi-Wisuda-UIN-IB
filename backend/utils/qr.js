const QRCode = require('qrcode');

// Isi QR: "SIWIS|<nomor peserta>"
const payload = (nomor) => `SIWIS|${nomor}`;

const qrDataUrl = (nomor) => QRCode.toDataURL(payload(nomor), { margin: 1, width: 300 });
const qrBuffer = (nomor) => QRCode.toBuffer(payload(nomor), { margin: 1, width: 300 });

// Menerima "SIWIS|WIS-2026A-001" atau "WIS-2026A-001"
const parseKode = (kode) => String(kode || '').trim().replace(/^SIWIS\|/i, '').toUpperCase();

module.exports = { payload, qrDataUrl, qrBuffer, parseKode };
