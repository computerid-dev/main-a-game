/*!
 * anti-clone.js — verifikasi index.html (dan halaman utama) milik NYr B°t.
 *
 * Cara kerja:
 *  1. Halaman disembunyikan (data-anticlone="pending") sampai lolos verifikasi.
 *  2. Mengambil /anti-clone.json dari server ASLI (atribut data-origin; kosong = origin yang sama).
 *  3. Mode "index": hostname halaman harus ada di daftar host resmi DAN hash SHA-256 isi
 *     index.html harus sama dengan hash di server (menolak index.html yang diubah/disalin).
 *     Mode "guard" (halaman lain): cukup cek hostname.
 *  4. Gagal → konten dihapus & diganti pesan penolakan.
 *
 * Catatan jujur: ini penghalang untuk salinan sembarangan, bukan perlindungan mutlak —
 * kode sisi-klien selalu bisa diubah oleh orang yang sengaja.
 * Isi data-origin dengan alamat publik web saat deploy (mis. https://bot.contoh.com).
 *
 * Situs statis resmi (GitHub Pages, Netlify, dsb): daftarkan di STATIC_SITES di bawah. Halaman
 * yang dibuka dari host + awalan path itu langsung lolos, tanpa perlu /anti-clone.json dari server
 * bot (host statis tidak punya file itu). Host/path lain tetap diverifikasi seperti biasa.
 */
(function () {
  "use strict";
  var el = document.currentScript;
  var mode = (el && el.getAttribute("data-mode")) || "index";
  var origin = ((el && el.getAttribute("data-origin")) || "").replace(/\/+$/, "") || location.origin;
  var root = document.documentElement;

  // Situs statis resmi: { host, path (awalan, diawali & diakhiri "/") }. Tambah baris bila pindah host.
  var STATIC_SITES = [
    { host: "computerid-dev.github.io", path: "/main-a-game/" }
  ];
  function onStaticSite() {
    return STATIC_SITES.some(function (x) {
      return location.hostname === x.host && location.pathname.indexOf(x.path) === 0;
    });
  }

  function deny() {
    root.setAttribute("data-anticlone", "blocked");
    document.body.innerHTML = "";
    var d = document.createElement("div");
    d.textContent = "Akses ditolak: salinan tidak sah.";
    d.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#1A1613;color:#EFE6D2;font:700 18px ui-monospace,monospace;text-align:center;padding:24px";
    document.body.appendChild(d);
    root.style.visibility = "visible";
  }
  function ok() { root.setAttribute("data-anticlone", "ok"); root.style.visibility = ""; }

  function norm(t) { return t.replace(/\r\n/g, "\n").trim(); }
  function sha256(text) {
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", data).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    });
  }

  if (onStaticSite()) { ok(); return; }

  fetch(origin + "/anti-clone.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error("x"); return r.json(); })
    .then(function (cfg) {
      if (!cfg || !cfg.hosts || cfg.hosts.indexOf(location.hostname) < 0) throw new Error("host");
      if (mode !== "index" || !cfg.index) return;
      if (!(window.crypto && crypto.subtle)) return; // konteks tidak aman: lewati cek hash
      return fetch(location.pathname, { cache: "no-store" })
        .then(function (r) { return r.text(); })
        .then(function (t) { return sha256(norm(t)); })
        .then(function (h) { if (h !== cfg.index) throw new Error("hash"); });
    })
    .then(ok)
    .catch(deny);
})();
