// Writes the PNG app icons from static/icon.svg. iPhones ignore SVG
// home-screen icons, so the PNGs are committed; run this again after
// changing the SVG:  node scripts/make-icons.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync('static/icon.svg');

// Plain icons: the rounded square as drawn.
for (const [file, size] of [
	['static/icon-192.png', 192],
	['static/icon-512.png', 512],
	['static/favicon-32.png', 32]
]) {
	await sharp(svg, { density: 384 }).resize(size, size).png().toFile(file);
	console.log(file);
}

// Full-bleed icons on solid olive: Android crops "maskable" icons to a circle
// or squircle (art in the middle 80%), and iPhones round the corners
// themselves and would fill see-through corners with black.
async function fullBleed(file, size, scale) {
	const art = Math.round(size * scale);
	const inner = await sharp(svg, { density: 384 }).resize(art, art).png().toBuffer();
	await sharp({ create: { width: size, height: size, channels: 4, background: '#4f6b3a' } })
		.composite([{ input: inner, gravity: 'center' }])
		.png()
		.toFile(file);
	console.log(file);
}
await fullBleed('static/icon-maskable-512.png', 512, 0.8);
await fullBleed('static/apple-touch-icon.png', 180, 1);

// favicon.ico for browsers that ask for it by name: a 32 px PNG inside an ICO wrapper.
const png = await sharp(svg, { density: 384 }).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // icon
header.writeUInt16LE(1, 4); // one image
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // no palette
header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10); // planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18); // offset
writeFileSync('static/favicon.ico', Buffer.concat([header, png]));
console.log('static/favicon.ico');
