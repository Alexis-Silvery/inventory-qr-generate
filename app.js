let config = {};

/* =========================
   CONFIG LOAD (PWA ENTRY)
========================= */

async function loadConfig() {
  const res = await fetch('/config/config.json');
  config = await res.json();

  initApp();
}

/* =========================
   DOM ELEMENTS
========================= */

const form = document.getElementById('code-form');

const partition1 = document.getElementById('partition1');
const partition2 = document.getElementById('partition2');
const partition3 = document.getElementById('partition3');
const partition4 = document.getElementById('partition4');

const productInput = document.getElementById('product');

const generatedCodeEl = document.getElementById('generated-code');
const generatedProductEl = document.getElementById('generated-product');

const codeListEl = document.getElementById('code-list');
const clearListButton = document.getElementById('clear-list');

const qrCodeLocationContainer = document.getElementById('qr-code-location');
const qrCodeProductContainer = document.getElementById('qr-code-product');

const barcodeLocationSvg = document.getElementById('barcode-location');
const barcodeProductSvg = document.getElementById('barcode-product');

let savedCodes = [];

const codeStoreKey = 'inventoryCodes';

/* =========================
   DROPDOWNS
========================= */

function populateDropdown(select, values) {
  select.innerHTML = '';

  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function updateDropdowns(prefix) {
  const data = config[prefix];

  if (!data) return;

  populateDropdown(partition2, data.partition2);
  populateDropdown(partition3, data.partition3);
  populateDropdown(partition4, data.partition4);

  // IMPORTANTÍSSIMO: set default values
  partition2.value = data.partition2[0];
  partition3.value = data.partition3[0];
  partition4.value = data.partition4[0];
}

/* =========================
   CODE BUILDER
========================= */

function buildCode() {
  return [
    partition1.value,
    partition2.value,
    partition3.value,
    partition4.value
  ].join('');
}

function buildDisplayCode() {
  return [
    partition1.value,
    partition2.value,
    partition3.value,
    partition4.value
  ].join('.');
}

/* =========================
   RENDER LABELS
========================= */

function renderLabels(code, product) {
  const displayCode = buildDisplayCode();
  const productValue = product || 'PRODUCT';
  generatedCodeEl.textContent = displayCode;
  generatedCodeEl.textContent = code;
  generatedProductEl.textContent = product || 'No product description';

  qrCodeLocationContainer.innerHTML = '';
  qrCodeProductContainer.innerHTML = '';

  new QRCode(qrCodeLocationContainer, {
    text: code,
    width: 220,
    height: 220,
    colorDark: '#111827',
    colorLight: '#f8fafc',
    correctLevel: QRCode.CorrectLevel.H,
  });

  new QRCode(qrCodeProductContainer, {
    text: productValue,
    width: 220,
    height: 220,
    colorDark: '#111827',
    colorLight: '#f8fafc',
    correctLevel: QRCode.CorrectLevel.H,
  });

  JsBarcode(barcodeLocationSvg, code, {
  format: 'CODE128',
  width: 3,              // 🔥 mais grosso
  height: 120,           // 🔥 mais alto
  displayValue: true,
  fontSize: 18,
  margin: 15,            // 🔥 mais margem
  background: "#ffffff",
});

  JsBarcode(barcodeProductSvg, productValue, {
    format: 'CODE128',
    width: 3,
    height: 120,
    displayValue: true,
    fontSize: 14,
    margin: 8,
  });
}

/* =========================
   LOCAL STORAGE
========================= */

function saveCodes() {
  localStorage.setItem(codeStoreKey, JSON.stringify(savedCodes));
}

function loadCodes() {
  const stored = localStorage.getItem(codeStoreKey);
  savedCodes = stored ? JSON.parse(stored) : [];
}

/* =========================
   CODE LIST UI
========================= */

function renderCodeList() {
  codeListEl.innerHTML = '';

  if (savedCodes.length === 0) {
    codeListEl.innerHTML =
      '<li class="empty-state">No saved codes yet. Generate and save one to start.</li>';
    return;
  }

  savedCodes.forEach((entry, index) => {
    const li = document.createElement('li');

    const details = document.createElement('div');
    details.className = 'code-details';
    details.innerHTML = `
      <strong>${entry.code}</strong>
      <span>${entry.product || 'No product text'}</span>
    `;

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';

    const useButton = document.createElement('button');
    useButton.textContent = 'Use';
    useButton.type = 'button';
    useButton.style.background = '#10b981';
    useButton.onclick = () => regenerateFromEntry(entry);

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.type = 'button';
    removeButton.onclick = () => {
      savedCodes.splice(index, 1);
      saveCodes();
      renderCodeList();
    };

    actions.appendChild(useButton);
    actions.appendChild(removeButton);

    li.appendChild(details);
    li.appendChild(actions);

    codeListEl.appendChild(li);
  });
}

/* =========================
   REGENERATE ENTRY
========================= */

function regenerateFromEntry(entry) {
  const parts = entry.code.split('.');

  if (parts.length === 4) {
    partition1.value = parts[0];

    updateDropdowns(parts[0]);

    partition2.value = parts[1];
    partition3.value = parts[2];
    partition4.value = parts[3];
  }

  productInput.value = entry.product || '';
  renderLabels(entry.code, entry.product);
}

/* =========================
   SAVE LOGIC
========================= */

function addCodeToList(code, product) {
  const existingIndex = savedCodes.findIndex(
    (item) => item.code === code
  );

  if (existingIndex >= 0) {
    savedCodes[existingIndex].product = product;
  } else {
    savedCodes.unshift({ code, product });

    if (savedCodes.length > 25) {
      savedCodes.pop();
    }
  }

  saveCodes();
  renderCodeList();
}

/* =========================
   UI EVENTS
========================= */

function handleCodeChange() {
  const code = buildCode();
  const product = productInput.value.trim();

  renderLabels(code, product);
}

/* =========================
   INIT APP
========================= */

function initApp() {
  const prefixes = Object.keys(config);

  if (prefixes.length === 0) {
    console.error("Config vazio ou não carregou");
    return;
  }

  // reset + fill dropdown
  populateDropdown(partition1, prefixes);

  // define default seguro
  partition1.value = prefixes[0];

  updateDropdowns(prefixes[0]);

  loadCodes();
  renderCodeList();

  // força render após tudo estar pronto
  setTimeout(() => {
    handleCodeChange();
  }, 0);
}

/* =========================
   EVENTS
========================= */

partition1.addEventListener('change', (e) => {
  updateDropdowns(e.target.value);
  handleCodeChange();
});

partition2.addEventListener('change', handleCodeChange);
partition3.addEventListener('change', handleCodeChange);
partition4.addEventListener('change', handleCodeChange);

productInput.addEventListener('input', handleCodeChange);

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const code = buildCode();
  const product = productInput.value.trim();

  addCodeToList(code, product);
});

clearListButton.addEventListener('click', () => {
  savedCodes = [];
  saveCodes();
  renderCodeList();
});

/* =========================
   START APP
========================= */

loadConfig();