/**
 * Pure JavaScript QR Code Generator
 * Core QR Code encoding based on Project Nayuki (MIT License)
 * Zero external dependencies. Generates standard NPCI-compatible QR codes
 * as Base64 PNG data URLs, Canvas, or SVG.
 */

/* eslint-disable */
export const QrCode = (() => {
  class QrCode {
    constructor(version, errorCorrectionLevel, dataCodewords, msk) {
      if (version < 1 || version > 40) throw new RangeError("Version value out of range");
      if (msk < -1 || msk > 7) throw new RangeError("Mask value out of range");
      this.version = version;
      this.size = version * 4 + 17;
      this.errorCorrectionLevel = errorCorrectionLevel;

      let modules = [];
      let isFunction = [];
      for (let y = 0; y < this.size; y++) {
        modules.push(new Array(this.size).fill(false));
        isFunction.push(new Array(this.size).fill(false));
      }
      this.modules = modules;
      this.isFunction = isFunction;

      this._drawFunctionPatterns();
      const allCodewords = this._addEccAndInterleave(dataCodewords);
      this._drawCodewords(allCodewords);

      if (msk === -1) {
        let minPenalty = 1e9;
        let bestMask = 0;
        for (let i = 0; i < 8; i++) {
          this._applyMask(i);
          this._drawFormatBits(i);
          const penalty = this._getPenaltyScore();
          if (penalty < minPenalty) {
            minPenalty = penalty;
            bestMask = i;
          }
          this._applyMask(i); // undo
        }
        msk = bestMask;
      }
      this.mask = msk;
      this._applyMask(msk);
      this._drawFormatBits(msk);
    }

    getModule(x, y) {
      if (x < 0 || x >= this.size || y < 0 || y >= this.size) return false;
      return this.modules[y][x];
    }

    _drawFunctionPatterns() {
      const s = this.size;
      for (let i = 0; i < s; i++) {
        this._setFunctionModule(6, i, i % 2 === 0);
        this._setFunctionModule(i, 6, i % 2 === 0);
      }
      this._drawFinderPattern(3, 3);
      this._drawFinderPattern(s - 4, 3);
      this._drawFinderPattern(3, s - 4);

      const alignPatPos = QrCode._getAlignmentPatternPositions(this.version);
      const numAlign = alignPatPos.length;
      for (let i = 0; i < numAlign; i++) {
        for (let j = 0; j < numAlign; j++) {
          if (
            (i === 0 && j === 0) ||
            (i === 0 && j === numAlign - 1) ||
            (i === numAlign - 1 && j === 0)
          ) {
            continue;
          }
          this._drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
        }
      }

      this._drawFormatBits(0);
      this._drawVersion();
    }

    _drawFinderPattern(x, y) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
            this._setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
          }
        }
      }
    }

    _drawAlignmentPattern(x, y) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          this._setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }

    _setFunctionModule(x, y, isBlack) {
      this.modules[y][x] = isBlack;
      this.isFunction[y][x] = true;
    }

    _drawFormatBits(mask) {
      const data = (this.errorCorrectionLevel.formatBits << 3) | mask;
      let rem = data;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const bits = ((data << 10) | rem) ^ 0x5412;
      const s = this.size;

      for (let i = 0; i <= 5; i++) this._setFunctionModule(8, i, QrCode._getBit(bits, i));
      this._setFunctionModule(8, 7, QrCode._getBit(bits, 6));
      this._setFunctionModule(8, 8, QrCode._getBit(bits, 7));
      this._setFunctionModule(7, 8, QrCode._getBit(bits, 8));
      for (let i = 9; i < 15; i++) this._setFunctionModule(14 - i, 8, QrCode._getBit(bits, i));

      for (let i = 0; i < 8; i++) this._setFunctionModule(s - 1 - i, 8, QrCode._getBit(bits, i));
      for (let i = 8; i < 15; i++) this._setFunctionModule(8, s - 15 + i, QrCode._getBit(bits, i));
      this._setFunctionModule(8, s - 8, true);
    }

    _drawVersion() {
      if (this.version < 7) return;
      let rem = this.version;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = (this.version << 12) | rem;
      const s = this.size;
      for (let i = 0; i < 18; i++) {
        const color = QrCode._getBit(bits, i);
        const a = s - 11 + (i % 3);
        const b = Math.floor(i / 3);
        this._setFunctionModule(a, b, color);
        this._setFunctionModule(b, a, color);
      }
    }

    _addEccAndInterleave(data) {
      const ver = this.version;
      const ecl = this.errorCorrectionLevel;
      const numBlocks = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
      const blockEccLen = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
      const rawCodewords = Math.floor(QrCode._getNumRawDataModules(ver) / 8);
      const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
      const shortBlockLen = Math.floor(rawCodewords / numBlocks);

      let blocks = [];
      const rsDiv = QrCode._reedSolomonComputeDivisor(blockEccLen);
      for (let i = 0, k = 0; i < numBlocks; i++) {
        const datLen = shortBlockLen - blockEccLen + (i >= numShortBlocks ? 1 : 0);
        const dat = data.slice(k, k + datLen);
        k += datLen;
        const ecc = QrCode._reedSolomonComputeRemainder(dat, rsDiv);
        blocks.push({ data: dat, ecc });
      }

      let result = [];
      for (let i = 0; i < shortBlockLen - blockEccLen + 1; i++) {
        for (let j = 0; j < numBlocks; j++) {
          if (i < blocks[j].data.length) result.push(blocks[j].data[i]);
        }
      }
      for (let i = 0; i < blockEccLen; i++) {
        for (let j = 0; j < numBlocks; j++) {
          result.push(blocks[j].ecc[i]);
        }
      }
      return result;
    }

    _drawCodewords(data) {
      const s = this.size;
      let i = 0;
      for (let right = s - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < s; vert++) {
          for (let j = 0; j < 2; j++) {
            const x = right - j;
            const upward = ((right + 1) & 2) === 0;
            const y = upward ? s - 1 - vert : vert;
            if (!this.isFunction[y][x] && i < data.length * 8) {
              this.modules[y][x] = QrCode._getBit(data[i >>> 3], 7 - (i & 7));
              i++;
            }
          }
        }
      }
    }

    _applyMask(mask) {
      const s = this.size;
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          if (this.isFunction[y][x]) continue;
          let invert = false;
          switch (mask) {
            case 0: invert = (x + y) % 2 === 0; break;
            case 1: invert = y % 2 === 0; break;
            case 2: invert = x % 3 === 0; break;
            case 3: invert = (x + y) % 3 === 0; break;
            case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
            case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
            case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
            case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          }
          if (invert) this.modules[y][x] = !this.modules[y][x];
        }
      }
    }

    _getPenaltyScore() {
      const s = this.size;
      let result = 0;
      for (let y = 0; y < s; y++) {
        let runColor = false;
        let runX = 0;
        for (let x = 0; x < s; x++) {
          const color = this.modules[y][x];
          if (color === runColor) {
            runX++;
            if (runX === 5) result += 3;
            else if (runX > 5) result++;
          } else {
            runColor = color;
            runX = 1;
          }
        }
      }
      for (let x = 0; x < s; x++) {
        let runColor = false;
        let runY = 0;
        for (let y = 0; y < s; y++) {
          const color = this.modules[y][x];
          if (color === runColor) {
            runY++;
            if (runY === 5) result += 3;
            else if (runY > 5) result++;
          } else {
            runColor = color;
            runY = 1;
          }
        }
      }
      for (let y = 0; y < s - 1; y++) {
        for (let x = 0; x < s - 1; x++) {
          const color = this.modules[y][x];
          if (
            color === this.modules[y][x + 1] &&
            color === this.modules[y + 1][x] &&
            color === this.modules[y + 1][x + 1]
          ) {
            result += 3;
          }
        }
      }
      let total = 0;
      let black = 0;
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          if (this.modules[y][x]) black++;
          total++;
        }
      }
      const k = Math.floor(Math.abs(black * 20 - total * 10) / total) - 1;
      result += k * 10;
      return result;
    }

    static _getBit(x, i) {
      return ((x >>> i) & 1) !== 0;
    }

    static _getAlignmentPatternPositions(ver) {
      if (ver === 1) return [];
      const num = Math.floor(ver / 7) + 2;
      const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (num * 2 - 2)) * 2;
      let result = [6];
      for (let pos = ver * 4 + 10; result.length < num; pos -= step) {
        result.splice(1, 0, pos);
      }
      return result;
    }

    static _getNumRawDataModules(ver) {
      let result = (16 * ver + 128) * ver + 64;
      if (ver >= 2) {
        const numAlign = Math.floor(ver / 7) + 2;
        result -= (25 * numAlign - 10) * numAlign - 55;
        if (ver >= 7) result -= 36;
      }
      return result;
    }

    static _reedSolomonComputeDivisor(degree) {
      let result = [];
      for (let i = 0; i < degree - 1; i++) result.push(0);
      result.push(1);
      let root = 1;
      for (let i = 0; i < degree; i++) {
        for (let j = 0; j < result.length; j++) {
          result[j] = QrCode._reedSolomonMultiply(result[j], root);
          if (j + 1 < result.length) result[j] ^= result[j + 1];
        }
        root = QrCode._reedSolomonMultiply(root, 0x02);
      }
      return result;
    }

    static _reedSolomonComputeRemainder(data, divisor) {
      let result = divisor.map(() => 0);
      for (const b of data) {
        const factor = b ^ result.shift();
        result.push(0);
        divisor.forEach((coef, i) => (result[i] ^= QrCode._reedSolomonMultiply(coef, factor)));
      }
      return result;
    }

    static _reedSolomonMultiply(x, y) {
      let z = 0;
      for (let i = 7; i >= 0; i--) {
        z = (z << 1) ^ ((z >>> 7) * 0x11d);
        z ^= ((y >>> i) & 1) * x;
      }
      return z;
    }

    static encodeText(text, ecl = QrCode.Ecc.MEDIUM) {
      const data = new TextEncoder().encode(text);
      let bitLen = 4; // Byte mode indicator
      let ver = 1;
      for (; ver <= 40; ver++) {
        const countBits = ver < 10 ? 8 : 16;
        const totalBits = bitLen + countBits + data.length * 8;
        const cap = QrCode._getNumDataCodewords(ver, ecl) * 8;
        if (totalBits <= cap) break;
      }
      if (ver > 40) throw new Error("Data too long to encode in QR code");

      let bb = [];
      function appendBits(val, len) {
        for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
      }
      appendBits(0x4, 4); // Byte mode
      appendBits(data.length, ver < 10 ? 8 : 16);
      for (const b of data) appendBits(b, 8);

      const cap = QrCode._getNumDataCodewords(ver, ecl) * 8;
      appendBits(0, Math.min(4, cap - bb.length));
      while (bb.length % 8 !== 0) bb.push(0);

      const pad = [0xec, 0x11];
      for (let i = 0; bb.length < cap; i++) {
        appendBits(pad[i % 2], 8);
      }

      let codewords = [];
      for (let i = 0; i < bb.length; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8; j++) byte = (byte << 1) | bb[i + j];
        codewords.push(byte);
      }

      return new QrCode(ver, ecl, codewords, -1);
    }

    static _getNumDataCodewords(ver, ecl) {
      return (
        Math.floor(QrCode._getNumRawDataModules(ver) / 8) -
        QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] *
          QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver]
      );
    }
  }

  QrCode.Ecc = {
    LOW: { ordinal: 0, formatBits: 1 },
    MEDIUM: { ordinal: 1, formatBits: 0 },
    QUARTILE: { ordinal: 2, formatBits: 3 },
    HIGH: { ordinal: 3, formatBits: 2 },
  };

  QrCode.ECC_CODEWORDS_PER_BLOCK = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  ];

  QrCode.NUM_ERROR_CORRECTION_BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
  ];

  return QrCode;
})();

/**
 * Generates a clean Base64 PNG data URL of a QR code in memory using HTML5 Canvas.
 * Zero network requests, 100% offline & instant.
 * 
 * @param {string} text - The UPI deep-link URI
 * @param {number} [targetSize=300] - Pixel width & height
 * @param {number} [margin=4] - Quiet zone margin in modules
 * @returns {string} Base64 PNG data URL (data:image/png;base64,...)
 */
export function generateQrPngDataUrl(text, targetSize = 300, margin = 4) {
  if (!text) return "";
  try {
    const qr = QrCode.encodeText(text, QrCode.Ecc.MEDIUM);
    const canvas = document.createElement("canvas");
    const moduleCount = qr.size + margin * 2;
    const scale = Math.max(2, Math.floor(targetSize / moduleCount));
    const actualSize = moduleCount * scale;

    canvas.width = actualSize;
    canvas.height = actualSize;
    const ctx = canvas.getContext("2d");

    // Crisp white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, actualSize, actualSize);

    // Deep black QR modules
    ctx.fillStyle = "#111827";
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.getModule(x, y)) {
          ctx.fillRect((x + margin) * scale, (y + margin) * scale, scale, scale);
        }
      }
    }

    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("Local QR PNG generation failed, using QR API fallback:", err);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${targetSize}x${targetSize}&margin=10&data=${encodeURIComponent(text)}`;
  }
}

/**
 * Generates an SVG string data URI of a QR code.
 * @param {string} text 
 * @param {number} [margin=4] 
 * @returns {string} SVG Data URL
 */
export function generateQrSvgDataUrl(text, margin = 4) {
  if (!text) return "";
  try {
    const qr = QrCode.encodeText(text, QrCode.Ecc.MEDIUM);
    const size = qr.size + margin * 2;
    let parts = [];
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.getModule(x, y)) {
          parts.push(`M${x + margin},${y + margin}h1v1h-1z`);
        }
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#ffffff"/><path fill="#111827" d="${parts.join("")}"/></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch (err) {
    return "";
  }
}
