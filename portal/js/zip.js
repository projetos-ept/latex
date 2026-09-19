/* ==========================================================================
   Portal TCC ABNT - gerador de ZIP (sem dependências externas)
   Método "store" (sem compressão): suficiente para projetos .tex e mantém o
   portal funcionando offline, sem CDN.
   ========================================================================== */
(function (P) {
  'use strict';

  var Z = {};

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    var esc = unescape(encodeURIComponent(str));
    var out = new Uint8Array(esc.length);
    for (var i = 0; i < esc.length; i++) out[i] = esc.charCodeAt(i);
    return out;
  }

  function dosTime(date) {
    return ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() / 2)) & 0xFFFF;
  }
  function dosDate(date) {
    return (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xFFFF;
  }

  function Writer() {
    this.chunks = [];
    this.size = 0;
  }
  Writer.prototype.push = function (bytes) {
    this.chunks.push(bytes);
    this.size += bytes.length;
  };
  Writer.prototype.u16 = function (v) {
    this.push(new Uint8Array([v & 0xFF, (v >>> 8) & 0xFF]));
  };
  Writer.prototype.u32 = function (v) {
    this.push(new Uint8Array([v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]));
  };

  /**
   * Cria um Blob .zip.
   * files: [{ path: 'main.tex', content: 'texto' | Uint8Array }]
   */
  Z.create = function (files, when) {
    var date = when || new Date();
    var time = dosTime(date), day = dosDate(date);
    var out = new Writer();
    var central = [];

    (files || []).forEach(function (file) {
      var nameBytes = utf8(String(file.path).replace(/^\/+/, ''));
      var data = file.content instanceof Uint8Array ? file.content : utf8(String(file.content == null ? '' : file.content));
      var crc = crc32(data);
      var offset = out.size;

      out.u32(0x04034B50);   // local file header
      out.u16(20);           // versão necessária
      out.u16(0x0800);       // flag: nomes em UTF-8
      out.u16(0);            // método: store
      out.u16(time);
      out.u16(day);
      out.u32(crc);
      out.u32(data.length);
      out.u32(data.length);
      out.u16(nameBytes.length);
      out.u16(0);
      out.push(nameBytes);
      out.push(data);

      central.push({ name: nameBytes, crc: crc, size: data.length, offset: offset });
    });

    var cdStart = out.size;
    central.forEach(function (e) {
      out.u32(0x02014B50);   // central directory header
      out.u16(0x031E);       // criado em unix
      out.u16(20);
      out.u16(0x0800);
      out.u16(0);
      out.u16(time);
      out.u16(day);
      out.u32(e.crc);
      out.u32(e.size);
      out.u32(e.size);
      out.u16(e.name.length);
      out.u16(0);
      out.u16(0);
      out.u16(0);
      out.u16(0);
      out.u32(0x81A40000 >>> 0); // atributos externos (0644)
      out.u32(e.offset);
      out.push(e.name);
    });
    var cdSize = out.size - cdStart;

    out.u32(0x06054B50);     // end of central directory
    out.u16(0);
    out.u16(0);
    out.u16(central.length);
    out.u16(central.length);
    out.u32(cdSize);
    out.u32(cdStart);
    out.u16(0);

    return new Blob(out.chunks, { type: 'application/zip' });
  };

  Z.crc32 = crc32;

  P.Zip = Z;
})(window.Portal = window.Portal || {});
