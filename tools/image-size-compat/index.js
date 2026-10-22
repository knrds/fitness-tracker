'use strict';
// Metro 0.83 (pinned by Expo SDK 54) calls the image-size 1.x API synchronously with a
// file path or a buffer. image-size <= 2.0.2 hangs on crafted ICNS/JXL/HEIF input; 2.x
// only accepts bytes, so this adapter reads paths itself and keeps Metro unchanged.
const fs = require('node:fs');
const { imageSize } = require('image-size');

function sizeOf(input) {
  const bytes = typeof input === 'string' ? fs.readFileSync(input) : input;
  if (!(bytes instanceof Uint8Array)) throw new TypeError('image-size-compat: expected a path or bytes');
  return imageSize(bytes);
}

module.exports = sizeOf;
module.exports.default = sizeOf;
module.exports.imageSize = sizeOf;
