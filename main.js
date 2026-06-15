// ============================================================
//  DES SIMULATOR — main.js
//  UI logic: input handling, rendering all step visualizations
// ============================================================

let currentMode   = 'encrypt';
let currentFormat = 'hex';
let lastResult    = null;

// ─── MODE & FORMAT ────────────────────────────────────────────

function setMode(m) {
  currentMode = m;
  document.getElementById('btnEncrypt').classList.toggle('active', m === 'encrypt');
  document.getElementById('btnDecrypt').classList.toggle('active', m === 'decrypt');
  const t = m === 'encrypt' ? 'Jalankan Enkripsi' : 'Jalankan Dekripsi';
  document.getElementById('btnRunText').textContent = t;
  document.getElementById('resOutputLabel').textContent = m === 'encrypt' ? 'Ciphertext (Hex)' : 'Plaintext (Hex)';
  document.getElementById('resBinLabel').textContent   = m === 'encrypt' ? 'Biner Ciphertext:' : 'Biner Plaintext:';
  updateBitCount('inputText','ptBits');
}

function setFormat(f) {
  currentFormat = f;
  document.getElementById('fmtBin').classList.toggle('active', f === 'bin');
  document.getElementById('fmtHex').classList.toggle('active', f === 'hex');
  const ptEl = document.getElementById('inputText');
  const keyEl = document.getElementById('inputKey');
  ptEl.placeholder  = f === 'hex' ? '0000000000000000  (16 hex digit = 64 bit)' : '0000000000000000000000000000000000000000000000000000000000000000  (64 bit)';
  keyEl.placeholder = f === 'hex' ? '133457799BBCDFF1  (16 hex digit = 64 bit)' : '0001001100110100010101110111100110011011101111001101111111110001';
  updateBitCount('inputText','ptBits');
  updateBitCount('inputKey','keyBits');
}

function updateBitCount(inputId, badgeId) {
  const val   = document.getElementById(inputId).value.trim().replace(/\s/g,'');
  const badge = document.getElementById(badgeId);
  let bits = 0;
  if (currentFormat === 'hex') bits = val.length * 4;
  else bits = val.replace(/[^01]/g,'').length;
  badge.textContent = `${bits} bit`;
  badge.className   = `bit-badge ${bits === 64 ? 'valid' : bits === 0 ? '' : 'invalid'}`;
}

// ─── PRESETS ──────────────────────────────────────────────────

function loadPreset() {
  setFormat('hex');
  document.getElementById('inputText').value = '0123456789ABCDEF';
  document.getElementById('inputKey').value  = '133457799BBCDFF1';
  updateBitCount('inputText','ptBits');
  updateBitCount('inputKey','keyBits');
}

function loadPreset2() {
  setFormat('hex');
  document.getElementById('inputText').value = 'FEDCBA9876543210';
  document.getElementById('inputKey').value  = '0F1571C947D9E859';
  updateBitCount('inputText','ptBits');
  updateBitCount('inputKey','keyBits');
}

// ─── INPUT PARSING ────────────────────────────────────────────

function parseInput() {
  const pt  = document.getElementById('inputText').value.trim().replace(/\s/g,'');
  const key = document.getElementById('inputKey').value.trim().replace(/\s/g,'');
  let ptBin, keyBin;

  if (currentFormat === 'hex') {
    if (!/^[0-9A-Fa-f]{16}$/.test(pt))  throw new Error('Plaintext/Ciphertext harus tepat 16 karakter hex (64-bit).');
    if (!/^[0-9A-Fa-f]{16}$/.test(key)) throw new Error('Kunci harus tepat 16 karakter hex (64-bit).');
    ptBin  = DES.hexToBin(pt.toUpperCase());
    keyBin = DES.hexToBin(key.toUpperCase());
  } else {
    const ptClean  = pt.replace(/[^01]/g,'');
    const keyClean = key.replace(/[^01]/g,'');
    if (ptClean.length  !== 64) throw new Error('Plaintext/Ciphertext harus tepat 64 bit biner.');
    if (keyClean.length !== 64) throw new Error('Kunci harus tepat 64 bit biner.');
    ptBin  = ptClean;
    keyBin = keyClean;
  }
  return { ptBin, keyBin };
}

// ─── RUN PROCESS ─────────────────────────────────────────────

function runProcess() {
  const errEl = document.getElementById('errorMsg');
  errEl.textContent = '';
  try {
    const { ptBin, keyBin } = parseInput();
    const result = DES.runDES(ptBin, keyBin, currentMode);
    lastResult = result;
    renderAll(result);
    document.getElementById('resultSection').classList.remove('hidden');
    document.getElementById('stepsNav').classList.remove('hidden');
    showTab('tabKeySchedule');
  } catch(e) {
    errEl.textContent = '⚠ ' + e.message;
  }
}

function resetAll() {
  document.getElementById('inputText').value = '';
  document.getElementById('inputKey').value  = '';
  document.getElementById('errorMsg').textContent = '';
  document.getElementById('resultSection').classList.add('hidden');
  document.getElementById('stepsNav').classList.add('hidden');
  ['tabKeySchedule','tabIP','tabRounds','tabSBox','tabFinal'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  updateBitCount('inputText','ptBits');
  updateBitCount('inputKey','keyBits');
  lastResult = null;
}

function doRoundTrip() {
  if (!lastResult) return;
  const hex = lastResult.ciphertextHex;
  setMode(currentMode === 'encrypt' ? 'decrypt' : 'encrypt');
  setFormat('hex');
  document.getElementById('inputText').value = hex;
  updateBitCount('inputText','ptBits');
  runProcess();
}

// ─── TAB SWITCHING ────────────────────────────────────────────

const ALL_TABS = ['tabKeySchedule','tabIP','tabRounds','tabSBox','tabFinal'];
const NAV_MAP  = {
  'tabKeySchedule': 0, 'tabIP': 1, 'tabRounds': 2, 'tabSBox': 3, 'tabFinal': 4
};

function showTab(tabId) {
  ALL_TABS.forEach(id => document.getElementById(id).classList.add('hidden'));
  document.getElementById(tabId).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === NAV_MAP[tabId]);
  });
}

// ─── RENDER ALL ───────────────────────────────────────────────

function renderAll(r) {
  renderResultBanner(r);
  renderKeySchedule(r);
  renderIP(r);
  renderRounds(r);
  renderSBoxTab(r);
  renderFinal(r);
}

// ─── RESULT BANNER ────────────────────────────────────────────

function renderResultBanner(r) {
  const inputHex = DES.binToHex(r.input);
  document.getElementById('resInputHex').textContent   = inputHex;
  document.getElementById('resOutputHex').textContent  = r.ciphertextHex;
  document.getElementById('resInputBin').textContent   = r.input;
  document.getElementById('resOutputBin').textContent  = r.ciphertext;
}

// ─── KEY SCHEDULE ─────────────────────────────────────────────

function renderKeySchedule(r) {
  const ks = r.keySchedule;

  // Key 64-bit
  renderBitRow('ks-key64', r.key, null, 8);
  // PC-1 output
  renderBitRow('ks-pc1out', ks.pc1, null, 7);
  // C0 D0
  renderBitRow('ks-C0', ks.C0);
  renderBitRow('ks-D0', ks.D0);

  // Table
  const tbody = document.getElementById('ksTableBody');
  tbody.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="round-num">K${i+1}</td>
      <td class="ls-val">${LS_SCHEDULE[i]}</td>
      <td style="font-size:0.62rem;color:var(--text2)">${ks.Csteps[i+1]}</td>
      <td style="font-size:0.62rem;color:var(--text2)">${ks.Dsteps[i+1]}</td>
      <td class="subkey-cell">${ks.subkeys[i]}</td>
      <td class="hex-cell">${DES.binToHex(ks.subkeys[i].padEnd(48,'0').slice(0,48))}</td>
    `;
    tbody.appendChild(tr);
  }
}

// ─── IP ───────────────────────────────────────────────────────

function renderIP(r) {
  renderBitRow('ip-input', r.input, null, 8);
  renderBitRow('ip-out',   r.ip,   null, 8);
  renderBitRow('ip-L0', r.L0);
  renderBitRow('ip-R0', r.R0);
  document.getElementById('ip-L0hex').textContent = 'Hex: ' + DES.binToHex(r.L0);
  document.getElementById('ip-R0hex').textContent = 'Hex: ' + DES.binToHex(r.R0);
}

// ─── ROUNDS ───────────────────────────────────────────────────

function renderRounds(r) {
  const container = document.getElementById('roundBtns');
  container.innerHTML = '';
  for (let i = 1; i <= 16; i++) {
    const btn = document.createElement('button');
    btn.className = `round-num-btn${i === 1 ? ' active' : ''}`;
    btn.textContent = i;
    btn.onclick = () => {
      document.querySelectorAll('.round-num-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderRoundDetail(r.rounds[i-1]);
    };
    container.appendChild(btn);
  }
  renderRoundDetail(r.rounds[0]);
}

function renderRoundDetail(rd) {
  const el = document.getElementById('roundDetail');
  const subHex = DES.binToHex(rd.subkey.padEnd(48,'0').slice(0,48));

  // S-Box summary row
  const sboxRows = rd.sBoxDetails.map(s =>
    `<span class="sbox-tag in">S${s.sbox}:[${s.input}]</span> baris=${s.row} kol=${s.col} → <span class="sbox-tag out">${s.out4}(${s.val})</span>`
  ).join('<br>');

  el.innerHTML = `
  <div class="round-card">
    <div class="round-card-header">
      <div class="round-num-big">R${rd.round}</div>
      <div class="round-meta">
        <div>L<sub>${rd.round-1}</sub> = <strong class="mono">${DES.binToHex(rd.L_in)}</strong></div>
        <div>R<sub>${rd.round-1}</sub> = <strong class="mono">${DES.binToHex(rd.R_in)}</strong></div>
        <div>K<sub>${rd.round}</sub>  = <strong class="mono">${subHex}</strong> (48-bit)</div>
      </div>
    </div>
    <div class="round-steps">

      <div class="round-step e-exp">
        <div class="rs-title blue">① E-Expansion (32 → 48 bit)</div>
        <div class="rs-val">${rd.expansion}</div>
        <div class="rs-sub">R<sub>${rd.round-1}</sub> diperluas dari 32-bit → 48-bit dengan tabel E</div>
      </div>

      <div class="round-step xor">
        <div class="rs-title purple">② XOR dengan Subkunci K<sub>${rd.round}</sub></div>
        <div class="xor-display">
          <span class="xor-val">${rd.expansion}</span>
          <span class="xor-op">⊕</span>
          <span class="xor-val key">${rd.subkey}</span>
          <span class="xor-op">=</span>
          <span class="xor-val result">${rd.xorResult}</span>
        </div>
      </div>

      <div class="round-step sbox">
        <div class="rs-title green">③ S-Box Substitusi (48 → 32 bit)</div>
        <div class="rs-val" style="font-size:0.68rem;line-height:1.9">${sboxRows}</div>
        <div class="rs-val" style="margin-top:0.5rem">Gabungan output S-Box: <span style="color:var(--green)">${rd.sBoxOut}</span></div>
      </div>

      <div class="round-step pperm">
        <div class="rs-title amber">④ P-Permutation (32 → 32 bit)</div>
        <div class="rs-val">${rd.pOut}</div>
        <div class="rs-sub">F(R,K) = ${DES.binToHex(rd.pOut)}</div>
      </div>

      <div class="round-step swap">
        <div class="rs-title">⑤ XOR & Swap</div>
        <div style="font-family:var(--mono);font-size:0.72rem;line-height:1.9">
          <div>L<sub>${rd.round}</sub> = R<sub>${rd.round-1}</sub> = <span style="color:var(--text)">${rd.L_out}</span>
            <span style="color:var(--text2)"> [${DES.binToHex(rd.L_out)}]</span></div>
          <div>R<sub>${rd.round}</sub> = L<sub>${rd.round-1}</sub> ⊕ F(R<sub>${rd.round-1}</sub>,K<sub>${rd.round}</sub>)
            = <span style="color:var(--amber)">${rd.R_out}</span>
            <span style="color:var(--text2)"> [${DES.binToHex(rd.R_out)}]</span></div>
        </div>
      </div>

    </div>
  </div>`;
}

// ─── SBOX TAB ─────────────────────────────────────────────────

function renderSBoxTab(r) {
  // Populate select
  const sel = document.getElementById('sboxRoundSel');
  sel.innerHTML = '';
  for (let i = 1; i <= 16; i++) {
    const opt = document.createElement('option');
    opt.value = i - 1;
    opt.textContent = `Round ${i}`;
    sel.appendChild(opt);
  }
  // Store rounds data globally
  window._desRounds = r.rounds;
  renderSBoxDetail();
  renderSBoxTables();
}

function renderSBoxDetail() {
  const idx = parseInt(document.getElementById('sboxRoundSel').value);
  if (!window._desRounds) return;
  const rd = window._desRounds[idx];
  const el = document.getElementById('sboxDetail');

  let html = `<div class="step-block">
    <div class="step-title">Round ${rd.round} — Detail 8 S-Box</div>
    <div class="step-desc">Input XOR = ${rd.xorResult} (dibagi 8 blok 6-bit)</div>
    <div class="sbox-grid">`;

  rd.sBoxDetails.forEach(s => {
    html += `<div class="sbox-item">
      <div class="sbox-num">S${s.sbox}</div>
      <div class="sbox-row">
        <span class="sbox-tag in">In: ${s.input}</span>
      </div>
      <div class="sbox-row">
        <span class="sbox-tag row">Baris: ${s.row} (bit 1,6 = ${s.input[0]}${s.input[5]})</span>
      </div>
      <div class="sbox-row">
        <span class="sbox-tag col">Kolom: ${s.col} (bit 2-5 = ${s.input.slice(1,5)})</span>
      </div>
      <div class="sbox-row">
        <span class="sbox-tag out">Out: ${s.out4} = ${s.val}</span>
      </div>
      <div class="sbox-formula">S${s.sbox}[${s.row}][${s.col}] = ${s.val}</div>
    </div>`;
  });

  html += `</div></div>`;
  el.innerHTML = html;
}

function renderSBoxTables() {
  const SBOXES = [
    [[14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7],[0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8],[4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0],[15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13]],
    [[15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10],[3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5],[0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15],[13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9]],
    [[10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8],[13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1],[13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7],[1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12]],
    [[7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15],[13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9],[10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4],[3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14]],
    [[2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9],[14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6],[4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14],[11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3]],
    [[12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11],[10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8],[9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6],[4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13]],
    [[4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1],[13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6],[1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2],[6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12]],
    [[13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7],[1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2],[7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8],[2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11]]
  ];

  const el = document.getElementById('sboxTables');
  let html = '<div class="sbox-static-grid">';
  SBOXES.forEach((sb, si) => {
    html += `<div class="sbox-ref"><div class="sbox-ref-title">S${si+1}</div>
    <table class="sbox-ref-table"><thead><tr><th></th>`;
    for (let c = 0; c < 16; c++) html += `<th>${c}</th>`;
    html += '</tr></thead><tbody>';
    sb.forEach((row, ri) => {
      html += `<tr><th>${ri}</th>`;
      row.forEach(v => html += `<td>${v}</td>`);
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// ─── FINAL ────────────────────────────────────────────────────

function renderFinal(r) {
  const last = r.rounds[15];
  renderBitRow('fin-L16', last.L_out);
  renderBitRow('fin-R16', last.R_out);
  renderBitRow('fin-preout', r.preOutput, null, 8);
  renderBitRow('fin-cipher', r.ciphertext, null, 8);
  document.getElementById('fin-cipherHex').textContent = r.ciphertextHex;
}

// ─── BIT ROW RENDERER ─────────────────────────────────────────

function renderBitRow(elId, bits, highlightSet, groupSize) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = '';
  bits.split('').forEach((b, i) => {
    const span = document.createElement('span');
    span.className = `bit ${b === '1' ? 'b1' : 'b0'}${highlightSet && highlightSet.has(i) ? ' highlight' : ''}`;
    span.textContent = b;
    el.appendChild(span);
    // Add space between groups
    if (groupSize && (i + 1) % groupSize === 0 && i < bits.length - 1) {
      const gap = document.createElement('span');
      gap.style.width = '6px';
      gap.style.display = 'inline-block';
      el.appendChild(gap);
    }
  });
}

// ─── VERIFY ON LOAD ───────────────────────────────────────────

(function selfTest() {
  try {
    // Standard DES test vector: PT=0123456789ABCDEF, Key=133457799BBCDFF1 → CT=85E813540F0AB405
    const pt  = DES.hexToBin('0123456789ABCDEF');
    const key = DES.hexToBin('133457799BBCDFF1');
    const r   = DES.runDES(pt, key, 'encrypt');
    const ct  = r.ciphertextHex;
    console.log(`[DES Self-Test] PT=0123456789ABCDEF, Key=133457799BBCDFF1`);
    console.log(`[DES Self-Test] Expected: 85E813540F0AB405`);
    console.log(`[DES Self-Test] Got:      ${ct}`);
    console.log(`[DES Self-Test] ${ct === '85E813540F0AB405' ? '✅ PASS' : '❌ FAIL'}`);
  } catch(e) {
    console.error('[DES Self-Test] Error:', e);
  }
})();
