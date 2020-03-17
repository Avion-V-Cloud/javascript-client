
/**
 * Decode a JWT token
 */
export function decodeJWTtoken(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  // no need to check availability of `encodeURIComponent`, since it is a function highly supported in browsers, node and other platforms.
  var jsonPayload = decodeURIComponent(decodeFromBase64(base64).split('').map(function (c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
}

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

/**
 * Encode a given string value to Base64 format
 *
 * @param {string} value to encode
 */
export function encodeToBase64(value) {
  // for browsers (moderns and old ones)
  if (typeof btoa === 'function')
    return btoa(value);

  // for node (version mayor than v4)
  if (typeof Buffer === 'function')
    return Buffer.from(value).toString('base64');

  // for other environments, such as RN, that do not support neither `btoa` or `Buffer`
  // Polyfill from: https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa#Polyfill
  let result = '';
  for (let block = 0, charCode, i = 0, map = chars;
    value.charAt(i | 0) || (map = '=', i % 1);
    result += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = value.charCodeAt(i += 3 / 4);
    if (charCode > 0xFF) {
      throw new Error('"btoa" failed: The string to be encoded contains characters outside of the Latin1 range.');
    }
    block = block << 8 | charCode;
  }
  return result;
}

const b64re = /^(?:[A-Za-z\d+/]{4})*?(?:[A-Za-z\d+/]{2}(?:==)?|[A-Za-z\d+/]{3}=?)?$/;

/**
 * Decode a given string value in Base64 format
 *
 * @param {string} value to decode
 */
export function decodeFromBase64(value) {
  // for browsers (moderns and old ones)
  if (typeof atob === 'function')
    return atob(value);

  // for node (version mayor than v4)
  if (typeof Buffer === 'function')
    return Buffer.from(value, 'base64').toString('binary');

  // for other environments, such as RN or iOS webWorkers, that do not support neither `atob` or `Buffer`
  // Polyfill from: https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/atob#Polyfill
  value = String(value).replace(/[\t\n\f\r ]+/g, '');
  value += '=='.slice(2 - (value.length & 3));
  if (!b64re.test(value))
    throw new TypeError('"atob" failed: The string to be decoded is not correctly encoded.');
  var bitmap, result = '',
    r1, r2, i = 0;
  for (; i < value.length;) {
    bitmap = chars.indexOf(value.charAt(i++)) << 18 | chars.indexOf(value.charAt(i++)) << 12 |
      (r1 = chars.indexOf(value.charAt(i++))) << 6 | (r2 = chars.indexOf(value.charAt(i++)));
    result += r1 === 64 ? String.fromCharCode(bitmap >> 16 & 255) :
      r2 === 64 ? String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255) :
        String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255, bitmap & 255);
  }
  return result;
}

import murmur from '../../engine/engine/murmur3';

export function hashUserKey(userKey) {
  return encodeToBase64(murmur.hash(userKey, 0).toString());
}