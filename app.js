// Konfigurasi Backend
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycby-s874pM6vjlgzRxejZXbsGeOOY_FLQiyQCZIq_F07DN7Vy1HEuZ-i4YiGtILZYY0/exec'; // Ganti dengan URL deployment GAS Anda
let useBackend = true;

let DB = {
  users: { admin: 'admin123', kasir: 'kasir123' },
  menu: [
    {id: 1, nama: 'Nasi Goreng', harga: 15000, kategori: 'Makanan'},
    {id: 2, nama: 'Mie Ayam', harga: 12000, kategori: 'Makanan'},
    {id: 3, nama: 'Es Teh Manis', harga: 4000, kategori: 'Minuman'},
    {id: 4, nama: 'Es Jeruk', harga: 5000, kategori: 'Minuman'}
  ],
  transaksi: [],
  setting: { namaToko: 'Warung Makan Barokah', alamat: 'Jl. Contoh No.123', pajak: 0, logo: '', banner: '' }
};

let currentUser = null;
let currentRole = null;
let cart = [];
let printerDevice = null;
let printerCharacteristic = null;
let transaksiTerakhir = null;
let useBackend = false; // Set true jika menggunakan Google Apps Script backend

// ==================== DATABASE FUNCTIONS ====================

async function loadDB() {
  if (useBackend) {
    try {
      const response = await fetch(`${BACKEND_URL}?action=loadAll`);
      const data = await response.json();
      if (data.success) {
        DB = data.data;
      }
    } catch (error) {
      console.error('Error loading from backend:', error);
      loadFromLocalStorage();
    }
  } else {
    loadFromLocalStorage();
  }
  
  updateUIFromSettings();
  initTahunFilter();
  initBulanFilter();
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem('kasirWarungDB');
  if (saved) DB = JSON.parse(saved);
}

function updateUIFromSettings() {
  document.getElementById('namaToko').value = DB.setting.namaToko;
  document.getElementById('alamatToko').value = DB.setting.alamat;
  document.getElementById('pajakSetting').value = DB.setting.pajak;
  document.getElementById('pajakPersen').innerText = DB.setting.pajak;
  document.getElementById('appTitle').innerText = DB.setting.namaToko;
  document.getElementById('loginTitle').innerText = DB.setting.namaToko;
  document.getElementById('headerNamaWarung').innerText = DB.setting.namaToko;
  
  if (DB.setting.logo) {
    document.getElementById('headerLogo').src = DB.setting.logo;
    document.getElementById('headerLogo').style.display = 'block';
    document.getElementById('previewLogo').src = DB.setting.logo;
    document.getElementById('previewLogo').style.display = 'block';
    document.getElementById('appIcon').href = DB.setting.logo;
  }
  
  if (DB.setting.banner) {
    document.getElementById('loginBanner').src = DB.setting.banner;
    document.getElementById('loginBanner').style.display = 'block';
    document.getElementById('previewBanner').src = DB.setting.banner;
    document.getElementById('previewBanner').style.display = 'block';
  }
}

async function saveDB() {
  if (useBackend) {
    try {
      await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveAll', data: DB })
      });
    } catch (error) {
      console.error('Error saving to backend:', error);
      saveToLocalStorage();
    }
  } else {
    saveToLocalStorage();
  }
}

function saveToLocalStorage() {
  localStorage.setItem('kasirWarungDB', JSON.stringify(DB));
}

// ==================== UTILITY FUNCTIONS ====================

function initTahunFilter() {
  const tahunSelect = document.getElementById('tahunFilter');
  const currentYear = new Date().getFullYear();
  tahunSelect.innerHTML = '';
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    tahunSelect.innerHTML += `<option value="${i}" ${i === currentYear ? 'selected' : ''}>${i}</option>`;
  }
}

function initBulanFilter() {
  const bulanSelect = document.getElementById('bulanFilter');
  const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  bulanSelect.innerHTML = '';
  namaBulan.forEach((b, i) => {
    bulanSelect.innerHTML += `<option value="${i}" ${i === new Date().getMonth() ? 'selected' : ''}>${b}</option>`;
  });
}

function formatRp(angka) {
  return 'Rp ' + Math.round(angka).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatTanggal(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ==================== IMAGE HANDLING ====================

function previewLogo(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('previewLogo').src = e.target.result;
      document.getElementById('previewLogo').style.display = 'block';
    }
    reader.readAsDataURL(file);
  }
}

function previewBanner(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('previewBanner').src = e.target.result;
      document.getElementById('previewBanner').style.display = 'block';
    }
    reader.readAsDataURL(file);
  }
}

// ==================== AUTHENTICATION ====================

async function login() {
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  
  let isValid = false;
  if (useBackend) {
    try {
      const response = await fetch(`${BACKEND_URL}?action=login&username=${u}&password=${p}`);
      const data = await response.json();
      isValid = data.success;
    } catch (error) {
      console.error('Login error:', error);
    }
  } else {
    isValid = DB.users[u] === p;
  }
  
  if (isValid) {
    currentUser = u;
    currentRole = u === 'admin' ? 'admin' : 'kasir';
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('appPage').classList.remove('hidden');
    document.getElementById('userInfo').innerText = `Login sebagai: ${u}`;
    document.getElementById('headerNamaWarung').innerText = DB.setting.namaToko;
    document.getElementById('adminTabs').classList.remove('hidden');
    
    if (currentRole === 'kasir') {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    }
    
    renderMenu();
    renderCart();
    renderTabelMenu();
    renderLaporan();
    renderLaporanBulanan();
    document.getElementById('resetInfo').classList.add('hidden');
  } else {
    alert('Username atau password salah!');
  }
}

async function lupaPassword() {
  if (confirm('Reset password ke default?\n\nAdmin: admin123\nKasir: kasir123\nLanjutkan?')) {
    if (useBackend) {
      try {
        await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resetPassword' })
        });
      } catch (error) {
        console.error('Reset password error:', error);
      }
    } else {
      DB.users.admin = 'admin123';
      DB.users.kasir = 'kasir123';
      saveDB();
    }
    
    document.getElementById('resetInfo').innerText = '✅ Password direset! Silakan login: admin/admin123 atau kasir/kasir123';
    document.getElementById('resetInfo').classList.remove('hidden');
    document.getElementById('username').value = 'admin';
    document.getElementById('password').value = '';
    document.getElementById('password').focus();
  }
}

function logout() {
  currentUser = null;
  currentRole = null;
  cart = [];
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('appPage').classList.add('hidden');
  document.getElementById('resetInfo').classList.add('hidden');
}

// ==================== NAVIGATION ====================

function showTab(tab) {
  ['penjualan', 'menu', 'laporan', 'bulanan', 'pengaturan'].forEach(t => {
    document.getElementById(t + 'Tab').classList.add('hidden');
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(tab + 'Tab').classList.remove('hidden');
  event.target.classList.add('active');
}

// ==================== MENU MANAGEMENT ====================

function renderMenu() {
  const search = document.getElementById('searchMenu').value.toLowerCase();
  const list = document.getElementById('menuList');
  list.innerHTML = '';
  
  DB.menu.filter(m => m.nama.toLowerCase().includes(search)).forEach(m => {
    const cartItem = cart.find(c => c.id === m.id);
    const qty = cartItem ? cartItem.qty : 0;

    list.innerHTML += `
      <div class="menu-item">
        <div>
          <strong>${m.nama}</strong><br>
          <span class="badge ${m.kategori === 'Minuman' ? 'minuman' : ''}">${m.kategori}</span>
          <span>${formatRp(m.harga)}</span>
        </div>
        <div class="qty-control">
          ${qty > 0 ? `<button class="qty-btn danger" onclick="kurangiDariMenu(${m.id})">-</button>
          <span style="min-width:30px;text-align:center;font-weight:bold;">${qty}</span>` : ''}
          <button class="qty-btn" onclick="tambahDariMenu(${m.id})">+</button>
        </div>
      </div>`;
  });
}

function tambahDariMenu(id) {
  const item = DB.menu.find(m => m.id === id);
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty++;
  else cart.push({...item, qty: 1});
  renderCart();
  renderMenu();
}

function kurangiDariMenu(id) {
  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty--;
    if (existing.qty <= 0) {
      cart = cart.filter(c => c.id !== id);
    }
    renderCart();
    renderMenu();
  }
}

function renderCart() {
  const list = document.getElementById('cartList');
  if (cart.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:#7f8c8d;padding:20px;">Keranjang kosong</p>';
  } else {
    list.innerHTML = '';
    cart.forEach((c, i) => {
      list.innerHTML += `
        <div class="cart-item">
          <span class="cart-item-name">${c.nama}</span>
          <div class="qty-control">
            <button class="qty-btn danger" onclick="ubahQty(${i}, -1)">-</button>
            <span style="min-width:30px;text-align:center;">${c.qty}</span>
            <button class="qty-btn" onclick="ubahQty(${i}, 1)">+</button>
            <span style="margin-left:8px;">${formatRp(c.harga * c.qty)}</span>
            <button class="danger btn-hapus-item" onclick="hapusItemCart(${i})">🗑️</button>
          </div>
        </div>`;
    });
  }
  hitungTotal();
}

function ubahQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  renderCart();
  renderMenu();
}

function hapusItemCart(index) {
  cart.splice(index, 1);
  renderCart();
  renderMenu();
}

function hitungTotal() {
  const subtotal = cart.reduce((sum, c) => sum + c.harga * c.qty, 0);
  const pajak = Math.round(subtotal * DB.setting.pajak / 100);
  const total = subtotal + pajak;
  document.getElementById('subtotal').innerText = formatRp(subtotal);
  document.getElementById('pajak').innerText = formatRp(pajak);
  document.getElementById('total').innerText = formatRp(total);
  
  const bayarInput = document.getElementById('bayar');
  if (cart.length > 0 && bayarInput.value === '') {
    bayarInput.value = total;
  }
  hitungKembaliLangsung(total);
  return {subtotal, pajak, total};
}

function hitungKembaliLangsung(total) {
  const bayar = parseInt(document.getElementById('bayar').value) || 0;
  const kembali = bayar - total;
  const kembaliEl = document.getElementById('kembali');
  const kembaliRow = document.getElementById('kembaliRow');
  
  kembaliEl.innerText = formatRp(Math.abs(kembali));
  if (kembali < 0) {
    kembaliRow.classList.remove('pas');
    kembaliRow.querySelector('span').innerText = 'KURANG:';
    document.getElementById('btnSimpan').disabled = true;
    document.getElementById('btnSimpanPrint').disabled = true;
  } else {
    kembaliRow.classList.add('pas');
    kembaliRow.querySelector('span').innerText = 'KEMBALIAN:';
    document.getElementById('btnSimpan').disabled = cart.length === 0;
    document.getElementById('btnSimpanPrint').disabled = cart.length === 0;
  }
}

function setBayar(jumlah) {
  const total = hitungTotal().total;
  if (jumlah === 'pas') {
    document.getElementById('bayar').value = total;
  } else {
    document.getElementById('bayar').value = jumlah;
  }
  hitungKembaliLangsung(total);
}

function hitungKembali() {
  const total = Math.round(cart.reduce((sum, c) => sum + c.harga * c.qty, 0) * (100 + DB.setting.pajak) / 100);
  hitungKembaliLangsung(total);
}

async function simpanTransaksi(printLangsung = false) {
  if (cart.length === 0) return alert('Keranjang kosong!');
  
  const {subtotal, pajak, total} = hitungTotal();
  const bayar = parseInt(document.getElementById('bayar').value) || 0;
  if (bayar < total) return alert('Uang bayar kurang!');
  
  const trx = {
    id: Date.now(),
    waktu: new Date().toISOString(),
    waktuDisplay: new Date().toLocaleString('id-ID'),
    tanggal: new Date().toLocaleDateString('id-ID'),
    items: JSON.parse(JSON.stringify(cart)),
    subtotal, pajak, total, bayar,
    kembali: bayar - total,
    kasir: currentUser
  };
  
  DB.transaksi.push(trx);
  await saveDB();
  
  transaksiTerakhir = trx;
  document.getElementById('btnPrintTerakhir').disabled = false;
  renderLaporan();
  renderLaporanBulanan();
  
  if (printLangsung) {
    printStruk(trx);
  }
  
  cart = [];
  document.getElementById('bayar').value = '';
  renderCart();
  renderMenu();
  alert(`Transaksi berhasil!\nTotal: ${formatRp(total)}\nKembali: ${formatRp(trx.kembali)}`);
}

function printStrukTerakhir() {
  if (!transaksiTerakhir) return alert('Belum ada transaksi!');
  printStruk(transaksiTerakhir);
}

// ==================== MENU CRUD ====================

async function tambahMenu() {
  const nama = document.getElementById('namaMenu').value.trim();
  const harga = parseInt(document.getElementById('hargaMenu').value);
  const kategori = document.getElementById('kategoriMenu').value;
  
  if (!nama || !harga || harga <= 0) return alert('Lengkapi nama & harga menu!');
  
  DB.menu.push({id: Date.now(), nama, harga, kategori});
  await saveDB();
  
  document.getElementById('namaMenu').value = '';
  document.getElementById('hargaMenu').value = '';
  renderMenu();
  renderTabelMenu();
  alert('Menu berhasil ditambah!');
}

function renderTabelMenu() {
  const tbody = document.getElementById('tabelMenu');
  tbody.innerHTML = '';
  DB.menu.forEach(m => {
    tbody.innerHTML += `
      <tr>
        <td>${m.nama}</td>
        <td><span class="badge ${m.kategori === 'Minuman' ? 'minuman' : ''}">${m.kategori}</span></td>
        <td>${formatRp(m.harga)}</td>
        <td>
          <button class="secondary" style="width:auto;padding:6px 12px;margin-right:4px;" onclick="editMenu(${m.id})">Edit</button>
          <button class="danger" style="width:auto;padding:6px 12px;" onclick="hapusMenu(${m.id})">Hapus</button>
        </td>
      </tr>`;
  });
}

function editMenu(id) {
  const menu = DB.menu.find(m => m.id === id);
  document.getElementById('editId').value = menu.id;
  document.getElementById('editNama').value = menu.nama;
  document.getElementById('editHarga').value = menu.harga;
  document.getElementById('editKategori').value = menu.kategori;
  document.getElementById('modalEdit').classList.remove('hidden');
}

async function simpanEditMenu() {
  const id = parseInt(document.getElementById('editId').value);
  const nama = document.getElementById('editNama').value.trim();
  const harga = parseInt(document.getElementById('editHarga').value);
  const kategori = document.getElementById('editKategori').value;
  
  if (!nama || !harga || harga <= 0) return alert('Lengkapi data!');
  
  const menu = DB.menu.find(m => m.id === id);
  menu.nama = nama;
  menu.harga = harga;
  menu.kategori = kategori;
  await saveDB();
  
  renderMenu();
  renderTabelMenu();
  tutupModal();
  alert('Menu berhasil diupdate!');
}

function tutupModal() {
  document.getElementById('modalEdit').classList.add('hidden');
}

async function hapusMenu(id) {
  if (confirm('Hapus menu ini?')) {
    DB.menu = DB.menu.filter(m => m.id !== id);
    await saveDB();
    renderMenu();
    renderTabelMenu();
  }
}

// ==================== REPORTS ====================

function renderLaporan() {
  const hariIni = new Date().toDateString();
  const trxHariIni = DB.transaksi.filter(t => new Date(t.waktu).toDateString() === hariIni);
  const omzet = trxHariIni.reduce((sum, t) => sum + t.total, 0);
  
  document.getElementById('omzetHariIni').innerText = formatRp(omzet);
  document.getElementById('totalTrx').innerText = trxHariIni.length;

  const perTanggal = {};
  DB.transaksi.forEach(t => {
    const tgl = new Date(t.waktu).toDateString();
    if (!perTanggal[tgl]) perTanggal[tgl] = [];
    perTanggal[tgl].push(t);
  });

  const container = document.getElementById('laporanPerTanggal');
  container.innerHTML = '';

  if (Object.keys(perTanggal).length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#7f8c8d;">Belum ada transaksi</p>';
  } else {
    Object.keys(perTanggal).sort().reverse().forEach(tgl => {
      const trxList = perTanggal[tgl];
      const totalHari = trxList.reduce((sum, t) => sum + t.total, 0);

      let html = `
        <div class="laporan-tanggal">
          <div class="laporan-tanggal-header">
            <div>
              <strong>${formatTanggal(tgl)}</strong> - ${trxList.length} transaksi - ${formatRp(totalHari)}
            </div>
            ${currentRole === 'admin' ? `<button class="danger btn-hapus-tanggal" onclick="hapusLaporanTanggal('${tgl}')">🗑️ Hapus</button>` : ''}
          </div>
          <table style="margin-top:8px;">
            <thead><tr><th>Waktu</th><th>Items</th><th>Total</th><th>Kasir</th></tr></thead>
            <tbody>`;

      trxList.slice().reverse().forEach(t => {
        html += `
          <tr>
            <td>${t.waktuDisplay.split(', ')[1]}</td>
            <td>${t.items.map(i => `${i.nama} x${i.qty}`).join(', ')}</td>
            <td>${formatRp(t.total)}</td>
            <td>${t.kasir}</td>
          </tr>`;
      });

      html += `</tbody></table></div>`;
      container.innerHTML += html;
    });
  }
}

async function hapusLaporanTanggal(tgl) {
  if (!confirm(`Hapus SEMUA transaksi tanggal ${formatTanggal(tgl)}?\nTidak bisa dibatalkan!`)) return;
  
  DB.transaksi = DB.transaksi.filter(t => new Date(t.waktu).toDateString() !== tgl);
  await saveDB();
  
  renderLaporan();
  renderLaporanBulanan();
  alert('Laporan tanggal tersebut berhasil dihapus!');
}

function renderLaporanBulanan() {
  const bulan = parseInt(document.getElementById('bulanFilter').value);
  const tahun = parseInt(document.getElementById('tahunFilter').value);
  
  const trxBulan = DB.transaksi.filter(t => {
    const d = new Date(t.waktu);
    return d.getMonth() === bulan && d.getFullYear() === tahun;
  });
  
  const omzet = trxBulan.reduce((sum, t) => sum + t.total, 0);
  const hariUnik = [...new Set(trxBulan.map(t => new Date(t.waktu).toDateString()))].length;
  const rataHari = hariUnik > 0 ? omzet / hariUnik : 0;
  
  document.getElementById('omzetBulan').innerText = formatRp(omzet);
  document.getElementById('trxBulan').innerText = trxBulan.length;
  document.getElementById('rataHari').innerText = formatRp(rataHari);
  
  const perHari = {};
  trxBulan.forEach(t => {
    const tgl = new Date(t.waktu).toDateString();
    if (!perHari[tgl]) perHari[tgl] = { count: 0, total: 0 };
    perHari[tgl].count++;
    perHari[tgl].total += t.total;
  });
  
  const tbodyHari = document.getElementById('tabelBulanan');
  tbodyHari.innerHTML = '';
  
  if (Object.keys(perHari).length === 0) {
    tbodyHari.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#7f8c8d;">Belum ada transaksi bulan ini</td></tr>';
  } else {
    Object.keys(perHari).sort().reverse().forEach(tgl => {
      tbodyHari.innerHTML += `
        <tr>
          <td>${formatTanggal(tgl)}</td>
          <td>${perHari[tgl].count}</td>
          <td>${formatRp(perHari[tgl].total)}</td>
        </tr>`;
    });
  }
  
  const menuStats = {};
  trxBulan.forEach(t => {
    t.items.forEach(i => {
      if (!menuStats[i.nama]) menuStats[i.nama] = { qty: 0, total: 0 };
      menuStats[i.nama].qty += i.qty;
      menuStats[i.nama].total += i.harga * i.qty;
    });
  });
  
  const tbodyMenu = document.getElementById('tabelMenuTerlaris');
  tbodyMenu.innerHTML = '';
  const sortedMenu = Object.keys(menuStats).sort((a, b) => menuStats[b].qty - menuStats[a].qty);
  
  if (sortedMenu.length === 0) {
    tbodyMenu.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#7f8c8d;">Belum ada data</td></tr>';
  } else {
    sortedMenu.forEach(nama => {
      tbodyMenu.innerHTML += `
        <tr>
          <td>${nama}</td>
          <td>${menuStats[nama].qty}</td>
          <td>${formatRp(menuStats[nama].total)}</td>
        </tr>`;
    });
  }
}

// ==================== EXPORT FUNCTIONS ====================

function exportLaporanHarian() {
  const hariIni = new Date().toDateString();
  const trxHariIni = DB.transaksi.filter(t => new Date(t.waktu).toDateString() === hariIni);
  
  const data = trxHariIni.map(t => ({
    'Waktu': t.waktuDisplay,
    'Kasir': t.kasir,
    'Items': t.items.map(i => `${i.nama} x${i.qty}`).join(', '),
    'Subtotal': t.subtotal,
    'Pajak': t.pajak,
    'Total': t.total,
    'Bayar': t.bayar,
    'Kembali': t.kembali
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Harian');
  XLSX.writeFile(wb, `Laporan_${DB.setting.namaToko}_${new Date().toLocaleDateString('id-ID')}.xlsx`);
}

function exportLaporanBulanan() {
  const bulan = parseInt(document.getElementById('bulanFilter').value);
  const tahun = parseInt(document.getElementById('tahunFilter').value);
  const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][bulan];
  
  const trxBulan = DB.transaksi.filter(t => {
    const d = new Date(t.waktu);
    return d.getMonth() === bulan && d.getFullYear() === tahun;
  });
  
  const dataDetail = trxBulan.map(t => ({
    'Tanggal': formatTanggal(t.waktu),
    'Waktu': t.waktuDisplay,
    'Kasir': t.kasir,
    'Items': t.items.map(i => `${i.nama} x${i.qty}`).join(', '),
    'Subtotal': t.subtotal,
    'Pajak': t.pajak,
    'Total': t.total
  }));
  
  const perHari = {};
  trxBulan.forEach(t => {
    const tgl = formatTanggal(t.waktu);
    if (!perHari[tgl]) perHari[tgl] = { count: 0, total: 0 };
    perHari[tgl].count++;
    perHari[tgl].total += t.total;
  });
  
  const dataHarian = Object.keys(perHari).map(tgl => ({
    'Tanggal': tgl,
    'Jumlah Transaksi': perHari[tgl].count,
    'Total Omzet': perHari[tgl].total
  }));
  
  const menuStats = {};
  trxBulan.forEach(t => {
    t.items.forEach(i => {
      if (!menuStats[i.nama]) menuStats[i.nama] = { qty: 0, total: 0 };
      menuStats[i.nama].qty += i.qty;
      menuStats[i.nama].total += i.harga * i.qty;
    });
  });
  
  const dataMenu = Object.keys(menuStats).map(nama => ({
    'Nama Menu': nama,
    'Terjual': menuStats[nama].qty,
    'Total Pendapatan': menuStats[nama].total
  })).sort((a, b) => b.Terjual - a.Terjual);
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataDetail), 'Detail Transaksi');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataHarian), 'Rekap Harian');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataMenu), 'Menu Terlaris');
  XLSX.writeFile(wb, `Laporan_Bulanan_${namaBulan}_${tahun}.xlsx`);
}

function exportCSV() {
  const bulan = parseInt(document.getElementById('bulanFilter').value);
  const tahun = parseInt(document.getElementById('tahunFilter').value);
  
  const trxBulan = DB.transaksi.filter(t => {
    const d = new Date(t.waktu);
    return d.getMonth() === bulan && d.getFullYear() === tahun;
  });
  
  let csv = 'Tanggal,Waktu,Kasir,Items,Subtotal,Pajak,Total,Bayar,Kembali\n';
  trxBulan.forEach(t => {
    const items = t.items.map(i => `${i.nama} x${i.qty}`).join('; ');
    csv += `"${formatTanggal(t.waktu)}","${t.waktuDisplay}","${t.kasir}","${items}",${t.subtotal},${t.pajak},${t.total},${t.bayar},${t.kembali}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Laporan_${bulan+1}_${tahun}.csv`;
  a.click();
}

async function resetLaporan() {
  if (confirm('Hapus SEMUA data transaksi? Tidak bisa dibatalkan!')) {
    DB.transaksi = [];
    await saveDB();
    renderLaporan();
    renderLaporanBulanan();
    alert('Semua laporan berhasil dihapus!');
  }
}

// ==================== SETTINGS ====================

async function simpanPengaturan() {
  DB.setting.namaToko = document.getElementById('namaToko').value.trim();
  DB.setting.alamat = document.getElementById('alamatToko').value.trim();
  DB.setting.pajak = parseInt(document.getElementById('pajakSetting').value) || 0;
  
  const logoFile = document.getElementById('inputLogo').files[0];
  const bannerFile = document.getElementById('inputBanner').files[0];
  let promises = [];
  
  if (logoFile) {
    promises.push(new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = function(e) {
        DB.setting.logo = e.target.result;
        resolve();
      }
      reader.readAsDataURL(logoFile);
    }));
  }
  
  if (bannerFile) {
    promises.push(new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = function(e) {
        DB.setting.banner = e.target.result;
        resolve();
      }
      reader.readAsDataURL(bannerFile);
    }));
  }
  
  Promise.all(promises).then(async () => {
    await saveDB();
    updateUIFromSettings();
    alert('Pengaturan berhasil disimpan!');
    document.getElementById('pajakPersen').innerText = DB.setting.pajak;
    document.getElementById('headerNamaWarung').innerText = DB.setting.namaToko;
  });
}

function downloadManifest() {
  const manifest = {
    name: DB.setting.namaToko,
    short_name: DB.setting.namaToko.substring(0, 12),
    description: `Aplikasi kasir ${DB.setting.namaToko}`,
    start_url: "./index.html",
    display: "standalone",
    background_color: "#e8f4f8",
    theme_color: "#5b9bd5",
    icons: [
      { src: "./icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "./icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ]
  };
  
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'manifest.json';
  a.click();
  alert('manifest.json berhasil didownload!\n\nSelanjutnya:\n1. Upload ke GitHub\n2. Convert logo jadi icon-192.png & icon-512.png\n3. Upload juga ke GitHub');
}

async function ubahPassword() {
  const lama = document.getElementById('passLama').value;
  const baru = document.getElementById('passBaru').value;
  
  if (useBackend) {
    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changePassword', oldPassword: lama, newPassword: baru })
      });
      const data = await response.json();
      if (!data.success) return alert(data.message || 'Password lama salah!');
    } catch (error) {
      console.error('Change password error:', error);
      return alert('Gagal mengubah password!');
    }
  } else {
    if (DB.users.admin !== lama) return alert('Password lama salah!');
    if (!baru || baru.length < 6) return alert('Password baru minimal 6 karakter!');
    DB.users.admin = baru;
    await saveDB();
  }
  
  document.getElementById('passLama').value = '';
  document.getElementById('passBaru').value = '';
  alert('Password admin berhasil diubah!');
}

// ==================== BACKUP & RESTORE ====================

function backupData() {
  const dataStr = JSON.stringify(DB, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_kasir_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}.json`;
  a.click();
  alert('Backup berhasil didownload!\nKirim file ini ke device lain terus Restore.');
}

async function restoreData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const dataBaru = JSON.parse(e.target.result);
      if (confirm('Yakin timpa semua data dengan file backup ini?\nData lama akan hilang!')) {
        DB = dataBaru;
        await saveDB();
        updateUIFromSettings();
        renderMenu();
        renderTabelMenu();
        renderLaporan();
        renderLaporanBulanan();
        
        document.getElementById('restoreStatus').innerText = '✅ Data berhasil di-restore!';
        document.getElementById('restoreStatus').className = 'status ok';
        document.getElementById('restoreStatus').classList.remove('hidden');
      }
    } catch (err) {
      document.getElementById('restoreStatus').innerText = '❌ File backup rusak!';
      document.getElementById('restoreStatus').className = 'status err';
      document.getElementById('restoreStatus').classList.remove('hidden');
    }
  }
  reader.readAsText(file);
}

// ==================== PRINTER FUNCTIONS ====================

async function connectPrinter() {
  try {
    showPrinterStatus('Mencari printer...', 'ok');
    printerDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455']
    });
    const server = await printerDevice.gatt.connect();
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    printerCharacteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
    showPrinterStatus('Printer terhubung: ' + printerDevice.name, 'ok');
  } catch (err) {
    showPrinterStatus('Gagal konek: ' + err.message, 'err');
  }
}

function showPrinterStatus(msg, type) {
  const el = document.getElementById('printerStatus');
  el.innerText = msg;
  el.className = 'status ' + type;
  el.classList.remove('hidden');
}

async function printStruk(trx) {
  if (!printerCharacteristic) return alert('Hubungkan printer dulu di Pengaturan!');
  
  const ESC = '\x1B';
  const GS = '\x1D';
  const INIT = ESC + '@';
  const CENTER = ESC + 'a' + '\x01';
  const LEFT = ESC + 'a' + '\x00';
  const BOLD_ON = ESC + 'E' + '\x01';
  const BOLD_OFF = ESC + 'E' + '\x00';
  const CUT = GS + 'V' + '\x00';
  
  let struk = INIT;
  struk += CENTER + BOLD_ON;
  struk += DB.setting.namaToko + '\n';
  struk += BOLD_OFF;
  struk += DB.setting.alamat + '\n';
  struk += '================================\n';
  struk += LEFT;
  struk += `No: ${trx.id}\n`;
  struk += `${trx.waktuDisplay}\n`;
  struk += `Kasir: ${trx.kasir}\n`;
  struk += '--------------------------------\n';
  
  trx.items.forEach(i => {
    struk += `${i.nama}\n`;
    struk += ` ${i.qty} x ${formatRp(i.harga)} = ${formatRp(i.harga * i.qty)}\n`;
  });
  
  struk += '--------------------------------\n';
  struk += `Subtotal: ${formatRp(trx.subtotal)}\n`;
  if (trx.pajak > 0) struk += `Pajak ${DB.setting.pajak}%: ${formatRp(trx.pajak)}\n`;
  struk += BOLD_ON;
  struk += `TOTAL: ${formatRp(trx.total)}\n`;
  struk += BOLD_OFF;
  struk += `Bayar: ${formatRp(trx.bayar)}\n`;
  struk += `Kembali: ${formatRp(trx.kembali)}\n`;
  struk += CENTER;
  struk += '================================\n';
  struk += 'Terima Kasih!\n\n\n';
  struk += CUT;
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(struk);
    for (let i = 0; i < data.length; i += 512) {
      await printerCharacteristic.writeValue(data.slice(i, i + 512));
      await new Promise(r => setTimeout(r, 50));
    }
    showPrinterStatus('Struk berhasil dicetak!', 'ok');
  } catch (err) {
    showPrinterStatus('Gagal print: ' + err.message, 'err');
  }
}

// ==================== SERVICE WORKER REGISTRATION ====================

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => console.log('Service Worker registered:', reg))
    .catch(err => console.log('Service Worker registration failed:', err));
}

// ==================== INITIALIZATION ====================

loadDB();
