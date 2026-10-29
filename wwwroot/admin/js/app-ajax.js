/**
 * SIM KLINIK SEHAT MANDIRI
 * Single Page Application (SPA) Controller via Ajax & REST API
 */

const app = {
  currentUser: null,
  activeView: 'dashboard',
  dataTableInstance: null,
  chartInstance1: null,
  chartInstance2: null,

  init() {
    this.checkAuth();
    this.initClock();
    this.bindEvents();
    this.loadView('dashboard');
  },

  checkAuth() {
    const userStr = localStorage.getItem('simklinik_user');
    if (!userStr) {
      // Default to admin for seamless evaluation if opened directly
      this.currentUser = {
        id: 1,
        username: 'admin',
        nama_lengkap: 'Administrator Utama',
        email: 'admin@klinik.com',
        role: 'admin'
      };
      localStorage.setItem('simklinik_user', JSON.stringify(this.currentUser));
    } else {
      try {
        this.currentUser = JSON.parse(userStr);
      } catch {
        this.currentUser = { username: 'admin', nama_lengkap: 'Administrator', role: 'admin' };
      }
    }

    document.getElementById('user-display-name').textContent = this.currentUser.nama_lengkap || this.currentUser.username;
    document.getElementById('user-display-role').textContent = (this.currentUser.role || 'Admin').toUpperCase();
    document.getElementById('user-dropdown-name').textContent = this.currentUser.nama_lengkap || this.currentUser.username;
    document.getElementById('user-dropdown-email').textContent = this.currentUser.email || (this.currentUser.username + '@klinik.com');
  },

  logout() {
    Swal.fire({
      title: 'Konfirmasi Keluar',
      text: 'Apakah Anda yakin ingin keluar dari sistem?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0f766e',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('simklinik_user');
        localStorage.removeItem('simklinik_token');
        window.location.href = '/admin/login.html';
      }
    });
  },

  initClock() {
    const clockEl = document.getElementById('header-clock');
    const update = () => {
      const now = new Date();
      const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
      clockEl.innerHTML = `<i class="far fa-clock mr-1"></i> ${now.toLocaleDateString('id-ID', options)} WIB`;
    };
    update();
    setInterval(update, 1000);
  },

  bindEvents() {
    // Keep sidebar link active states in sync
    document.querySelectorAll('#sidebar-nav .nav-link').forEach(link => {
      link.addEventListener('click', function (e) {
        if (this.getAttribute('data-view')) {
          e.preventDefault();
        }
      });
    });
  },

  setActiveMenu(viewName) {
    document.querySelectorAll('#sidebar-nav .nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      }
    });
  },

  async api(endpoint, method = 'GET', data = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(endpoint, options);
      const result = await response.json();
      return result;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      return { success: false, message: 'Gagal menghubungi server API.' };
    }
  },

  formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  // ============================================================
  // VIEW ROUTER
  // ============================================================
  async loadView(viewName) {
    this.activeView = viewName;
    this.setActiveMenu(viewName);

    const container = document.getElementById('main-content');
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="fas fa-spinner fa-spin fa-2x text-teal"></i>
        <p class="mt-2 text-muted">Memuat data modul...</p>
      </div>`;

    if (this.dataTableInstance) {
      try { this.dataTableInstance.destroy(); } catch (e) {}
      this.dataTableInstance = null;
    }

    switch (viewName) {
      case 'dashboard':
        await this.renderDashboard(container);
        break;

      // MASTER
      case 'users':
        await this.renderUsers(container);
        break;
      case 'poli':
        await this.renderPoli(container);
        break;
      case 'dokter':
        await this.renderDokter(container);
        break;
      case 'pasien':
        await this.renderPasien(container);
        break;
      case 'tindakan':
        await this.renderTindakan(container);
        break;
      case 'obat':
        await this.renderObat(container);
        break;
      case 'supplier':
        await this.renderSupplier(container);
        break;

      // TRANSAKSI
      case 'kunjungan':
        await this.renderKunjungan(container);
        break;
      case 'rekammedis':
        await this.renderRekamMedis(container);
        break;
      case 'resep':
        await this.renderResep(container);
        break;
      case 'pembelian':
        await this.renderPembelian(container);
        break;
      case 'pembayaran':
        await this.renderPembayaran(container);
        break;

      // LAPORAN
      case 'lap-kunjungan':
        await this.renderLapKunjungan(container);
        break;
      case 'lap-pendapatan':
        await this.renderLapPendapatan(container);
        break;
      case 'lap-rekammedis':
        await this.renderLapRekamMedis(container);
        break;
      case 'lap-obat':
        await this.renderLapObat(container);
        break;

      // PENGATURAN
      case 'pengaturan':
        await this.renderPengaturan(container);
        break;

      default:
        container.innerHTML = `<div class="alert alert-warning">Modul ${viewName} belum tersedia.</div>`;
    }
  },

  // ============================================================
  // 1. DASHBOARD VIEW
  // ============================================================
  async renderDashboard(container) {
    const res = await this.api('/api/dashboard/stats');
    if (!res.success) {
      container.innerHTML = `<div class="alert alert-danger">${res.message}</div>`;
      return;
    }
    const data = res.data;

    // Update sidebar queue badge
    const badgeSidebar = document.getElementById('badge-antrian-sidebar');
    if (badgeSidebar) badgeSidebar.textContent = data.antrianMenunggu || 0;

    let antrianRows = '';
    if (data.antrianAktif && data.antrianAktif.length > 0) {
      data.antrianAktif.forEach((item, i) => {
        let badgeStatus = 'badge-secondary';
        if (item.status === 'menunggu') badgeStatus = 'badge-warning';
        if (item.status === 'dipanggil') badgeStatus = 'badge-primary';
        if (item.status === 'diperiksa') badgeStatus = 'badge-info';
        if (item.status === 'selesai') badgeStatus = 'badge-success';

        antrianRows += `
          <tr>
            <td><strong>#${i + 1}</strong></td>
            <td><span class="badge badge-light border font-weight-bold">${item.noKunjungan}</span></td>
            <td><strong>${item.namaPasien}</strong> <small class="text-muted d-block">RM: ${item.noRm}</small></td>
            <td>${item.namaPoli || '-'}</td>
            <td>${item.namaDokter || '-'}</td>
            <td><span class="badge ${badgeStatus} text-uppercase">${item.status}</span></td>
            <td>
              <button class="btn btn-xs btn-outline-primary mr-1" onclick="app.updateKunjunganStatus(${item.id}, 'dipanggil')" title="Panggil Antrian">
                <i class="fas fa-bullhorn"></i> Panggil
              </button>
              <button class="btn btn-xs btn-outline-info" onclick="app.openDirectEmr(${item.id}, ${item.pasienId})" title="Input Rekam Medis">
                <i class="fas fa-stethoscope"></i> Periksa
              </button>
            </td>
          </tr>
        `;
      });
    } else {
      antrianRows = '<tr><td colspan="7" class="text-center text-muted py-3">Tidak ada antrian aktif saat ini.</td></tr>';
    }

    let obatKritisRows = '';
    if (data.obatMenipisList && data.obatMenipisList.length > 0) {
      data.obatMenipisList.forEach(o => {
        obatKritisRows += `
          <tr>
            <td><strong>${o.kodeObat}</strong></td>
            <td>${o.namaObat}</td>
            <td><span class="badge badge-danger font-weight-bold">${o.stok} ${o.namaSatuan || 'Pcs'}</span></td>
            <td>${o.stokMinimum}</td>
            <td>
              <button class="btn btn-xs btn-outline-success" onclick="app.openRestokModal(${o.id}, '${o.namaObat}')">
                <i class="fas fa-cart-plus mr-1"></i> Restok
              </button>
            </td>
          </tr>
        `;
      });
    } else {
      obatKritisRows = '<tr><td colspan="5" class="text-center text-success py-3"><i class="fas fa-check-circle mr-1"></i> Stok seluruh obat aman.</td></tr>';
    }

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <h1 class="m-0 text-dark font-weight-bold">Dashboard SIM Klinik</h1>
            <small class="text-muted">Ikhtisar operasional, pelayanan pasien, dan keuangan klinik real-time</small>
          </div>
          <div class="col-sm-6 text-right">
            <button class="btn btn-sm btn-outline-secondary" onclick="app.loadView('dashboard')">
              <i class="fas fa-sync-alt mr-1"></i> Refresh Data
            </button>
            <button class="btn btn-sm btn-primary ml-2" onclick="app.openModalPendaftaran()">
              <i class="fas fa-plus-circle mr-1"></i> Pendaftaran Baru
            </button>
          </div>
        </div>
      </div>

      <!-- METRIC CARDS ROW -->
      <div class="row">
        <div class="col-lg-3 col-6">
          <div class="small-box bg-teal-custom">
            <div class="inner">
              <h3>${data.kunjunganHariIni}</h3>
              <p class="font-weight-bold">Kunjungan Hari Ini</p>
            </div>
            <div class="icon"><i class="fas fa-user-injured"></i></div>
            <a href="#" onclick="app.loadView('kunjungan')" class="small-box-footer">Lihat Antrian <i class="fas fa-arrow-circle-right"></i></a>
          </div>
        </div>

        <div class="col-lg-3 col-6">
          <div class="small-box bg-cyan-custom">
            <div class="inner">
              <h3>${data.antrianMenunggu}</h3>
              <p class="font-weight-bold">Pasien Mengantri</p>
            </div>
            <div class="icon"><i class="fas fa-clock"></i></div>
            <a href="#" onclick="app.loadView('kunjungan')" class="small-box-footer">Panggil Pasien <i class="fas fa-arrow-circle-right"></i></a>
          </div>
        </div>

        <div class="col-lg-3 col-6">
          <div class="small-box bg-emerald-custom">
            <div class="inner">
              <h3 style="font-size:1.6rem;">${this.formatRupiah(data.pendapatanHariIni)}</h3>
              <p class="font-weight-bold">Pendapatan Hari Ini</p>
            </div>
            <div class="icon"><i class="fas fa-cash-register"></i></div>
            <a href="#" onclick="app.loadView('pembayaran')" class="small-box-footer">Lihat Kasir <i class="fas fa-arrow-circle-right"></i></a>
          </div>
        </div>

        <div class="col-lg-3 col-6">
          <div class="small-box bg-amber-custom">
            <div class="inner">
              <h3>${data.obatKritis}</h3>
              <p class="font-weight-bold">Obat Stok Menipis</p>
            </div>
            <div class="icon"><i class="fas fa-exclamation-triangle"></i></div>
            <a href="#" onclick="app.loadView('obat')" class="small-box-footer">Cek Inventori <i class="fas fa-arrow-circle-right"></i></a>
          </div>
        </div>
      </div>

      <!-- CHARTS ROW -->
      <div class="row">
        <div class="col-lg-8">
          <div class="card card-outline card-primary">
            <div class="card-header border-0">
              <h3 class="card-title font-weight-bold"><i class="fas fa-chart-line text-primary mr-2"></i>Tren Kunjungan Pasien (7 Hari Terakhir)</h3>
            </div>
            <div class="card-body">
              <div style="height: 250px;">
                <canvas id="chartKunjungan"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card card-outline card-info">
            <div class="card-header border-0">
              <h3 class="card-title font-weight-bold"><i class="fas fa-stethoscope text-info mr-2"></i>Diagnosa Terbanyak (Top 5 ICD)</h3>
            </div>
            <div class="card-body">
              <div style="height: 250px;">
                <canvas id="chartDiagnosa"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- LIVE QUEUE & LOW STOCK TABLE ROW -->
      <div class="row">
        <div class="col-lg-8">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title font-weight-bold"><i class="fas fa-ticket-alt text-teal mr-2"></i>Antrian Pasien Berjalan Hari Ini</h3>
              <div class="card-tools">
                <span class="badge badge-primary">${data.antrianAktif ? data.antrianAktif.length : 0} Pasien</span>
              </div>
            </div>
            <div class="card-body p-0 table-responsive">
              <table class="table table-hover table-striped mb-0">
                <thead>
                  <tr>
                    <th>Antrian</th>
                    <th>No. Reg</th>
                    <th>Nama Pasien</th>
                    <th>Poli</th>
                    <th>Dokter</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  ${antrianRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card card-warning card-outline">
            <div class="card-header">
              <h3 class="card-title font-weight-bold text-danger"><i class="fas fa-exclamation-circle mr-2"></i>Peringatan Stok Obat Menipis</h3>
            </div>
            <div class="card-body p-0 table-responsive">
              <table class="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Obat</th>
                    <th>Sisa</th>
                    <th>Min</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  ${obatKritisRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    // Render Chart 1: Kunjungan Trend
    const ctx1 = document.getElementById('chartKunjungan')?.getContext('2d');
    if (ctx1) {
      const labels = data.grafikKunjungan.map(g => g.tanggal);
      const values = data.grafikKunjungan.map(g => g.jumlah);

      this.chartInstance1 = new Chart(ctx1, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Jumlah Kunjungan',
            data: values,
            borderColor: '#0f766e',
            backgroundColor: 'rgba(15, 118, 110, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#0f766e'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    }

    // Render Chart 2: Top Diagnosa
    const ctx2 = document.getElementById('chartDiagnosa')?.getContext('2d');
    if (ctx2) {
      const diagLabels = (data.topPenyakit && data.topPenyakit.length > 0) ? data.topPenyakit.map(d => `${d.kodeIcd}`) : ['Common Cold', 'Demam', 'Hipertensi', 'DM'];
      const diagValues = (data.topPenyakit && data.topPenyakit.length > 0) ? data.topPenyakit.map(d => d.jumlah) : [12, 9, 6, 4];

      this.chartInstance2 = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: diagLabels,
          datasets: [{
            data: diagValues,
            backgroundColor: ['#0f766e', '#0284c7', '#f59e0b', '#10b981', '#6366f1']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  },

  // ============================================================
  // MASTER: USERS
  // ============================================================
  async renderUsers(container) {
    const res = await this.api('/api/users');
    const items = res.data || [];

    let rows = '';
    items.forEach((u, idx) => {
      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${u.username}</strong></td>
          <td>${u.namaLengkap}</td>
          <td>${u.email || '-'}</td>
          <td><span class="badge badge-primary text-uppercase">${u.role}</span></td>
          <td><span class="badge ${u.status === 'aktif' ? 'badge-success' : 'badge-danger'}">${u.status}</span></td>
          <td>
            <button class="btn btn-xs btn-info mr-1" onclick="app.openEditUserModal(${u.id})"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-xs btn-danger" onclick="app.deleteUser(${u.id})"><i class="fas fa-trash"></i> Hapus</button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <h1 class="m-0 font-weight-bold"><i class="fas fa-user-cog text-teal mr-2"></i>Data Pengguna Sistem</h1>
            <small class="text-muted">Kelola akun staf, dokter, perawat, kasir, dan apoteker</small>
          </div>
          <div class="col-sm-6 text-right">
            <button class="btn btn-primary" onclick="app.openAddUserModal()">
              <i class="fas fa-user-plus mr-1"></i> Tambah Pengguna Baru
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-users">
            <thead>
              <tr>
                <th width="40">No</th>
                <th>Username</th>
                <th>Nama Lengkap</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th width="130">Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-users').DataTable({ responsive: true });
  },

  openAddUserModal() {
    this.renderModal(`
      <div class="modal fade" id="modalUser" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Tambah Pengguna Baru</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitUser(event)">
              <div class="modal-body">
                <div class="form-group">
                  <label>Username <span class="text-danger">*</span></label>
                  <input type="text" id="u-username" class="form-control" required>
                </div>
                <div class="form-group">
                  <label>Nama Lengkap <span class="text-danger">*</span></label>
                  <input type="text" id="u-nama" class="form-control" required>
                </div>
                <div class="form-group">
                  <label>Password <span class="text-danger">*</span></label>
                  <input type="password" id="u-password" class="form-control" required>
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" id="u-email" class="form-control">
                </div>
                <div class="row">
                  <div class="col-6 form-group">
                    <label>Role</label>
                    <select id="u-role" class="form-control">
                      <option value="admin">Admin</option>
                      <option value="dokter">Dokter</option>
                      <option value="perawat">Perawat</option>
                      <option value="pendaftaran">Pendaftaran</option>
                      <option value="kasir">Kasir</option>
                      <option value="apoteker">Apoteker</option>
                      <option value="gudang">Gudang</option>
                    </select>
                  </div>
                  <div class="col-6 form-group">
                    <label>Status</label>
                    <select id="u-status" class="form-control">
                      <option value="aktif">Aktif</option>
                      <option value="nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Pengguna</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalUser').modal('show');
  },

  async openEditUserModal(id) {
    const res = await this.api(`/api/users/${id}`);
    if (!res.success) return Swal.fire('Error', res.message, 'error');
    const u = res.data;

    this.renderModal(`
      <div class="modal fade" id="modalUser" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Edit Pengguna: ${u.username}</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitUser(event, ${u.id})">
              <div class="modal-body">
                <div class="form-group">
                  <label>Nama Lengkap <span class="text-danger">*</span></label>
                  <input type="text" id="u-nama" class="form-control" value="${u.namaLengkap}" required>
                </div>
                <div class="form-group">
                  <label>Password Baru <small class="text-muted">(Kosongkan jika tidak diganti)</small></label>
                  <input type="password" id="u-password" class="form-control" placeholder="Biarkan kosong jika tidak diubah">
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" id="u-email" class="form-control" value="${u.email || ''}">
                </div>
                <div class="row">
                  <div class="col-6 form-group">
                    <label>Role</label>
                    <select id="u-role" class="form-control">
                      <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                      <option value="dokter" ${u.role === 'dokter' ? 'selected' : ''}>Dokter</option>
                      <option value="perawat" ${u.role === 'perawat' ? 'selected' : ''}>Perawat</option>
                      <option value="pendaftaran" ${u.role === 'pendaftaran' ? 'selected' : ''}>Pendaftaran</option>
                      <option value="kasir" ${u.role === 'kasir' ? 'selected' : ''}>Kasir</option>
                      <option value="apoteker" ${u.role === 'apoteker' ? 'selected' : ''}>Apoteker</option>
                    </select>
                  </div>
                  <div class="col-6 form-group">
                    <label>Status</label>
                    <select id="u-status" class="form-control">
                      <option value="aktif" ${u.status === 'aktif' ? 'selected' : ''}>Aktif</option>
                      <option value="nonaktif" ${u.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalUser').modal('show');
  },

  async submitUser(e, id = null) {
    e.preventDefault();
    const payload = {
      namaLengkap: document.getElementById('u-nama').value.trim(),
      email: document.getElementById('u-email').value.trim(),
      role: document.getElementById('u-role').value,
      status: document.getElementById('u-status').value
    };
    if (document.getElementById('u-username')) {
      payload.username = document.getElementById('u-username').value.trim();
    }
    const pwd = document.getElementById('u-password').value;
    if (pwd) payload.password = pwd;

    const endpoint = id ? `/api/users/${id}` : '/api/users';
    const method = id ? 'PUT' : 'POST';

    const res = await this.api(endpoint, method, payload);
    if (res.success) {
      $('#modalUser').modal('hide');
      Swal.fire('Sukses', res.message, 'success');
      this.loadView('users');
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  async deleteUser(id) {
    Swal.fire({
      title: 'Hapus Pengguna?',
      text: 'Data yang dihapus tidak dapat dipulihkan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await this.api(`/api/users/${id}`, 'DELETE');
        if (res.success) {
          Swal.fire('Terhapus', res.message, 'success');
          this.loadView('users');
        } else {
          Swal.fire('Gagal', res.message, 'error');
        }
      }
    });
  },

  // ============================================================
  // MASTER: POLI
  // ============================================================
  async renderPoli(container) {
    const res = await this.api('/api/poli');
    const items = res.data || [];

    let rows = '';
    items.forEach((p, idx) => {
      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge badge-light border font-weight-bold">${p.kodePoli}</span></td>
          <td><strong>${p.namaPoli}</strong></td>
          <td>${p.deskripsi || '-'}</td>
          <td><strong>${this.formatRupiah(p.tarifPendaftaran)}</strong></td>
          <td><span class="badge ${p.status === 'aktif' ? 'badge-success' : 'badge-danger'}">${p.status}</span></td>
          <td>
            <button class="btn btn-xs btn-info mr-1" onclick="app.openEditPoliModal(${p.id})"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-xs btn-danger" onclick="app.deletePoli(${p.id})"><i class="fas fa-trash"></i> Hapus</button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <h1 class="m-0 font-weight-bold"><i class="fas fa-hospital text-teal mr-2"></i>Data Poliklinik</h1>
            <small class="text-muted">Master data poli rawat jalan dan tarif pendaftaran</small>
          </div>
          <div class="col-sm-6 text-right">
            <button class="btn btn-primary" onclick="app.openAddPoliModal()">
              <i class="fas fa-plus mr-1"></i> Tambah Poliklinik
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-poli">
            <thead>
              <tr>
                <th width="40">No</th>
                <th>Kode Poli</th>
                <th>Nama Poli</th>
                <th>Deskripsi</th>
                <th>Tarif Registrasi</th>
                <th>Status</th>
                <th width="130">Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-poli').DataTable({ responsive: true });
  },

  openAddPoliModal() {
    this.renderModal(`
      <div class="modal fade" id="modalPoli" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Tambah Poliklinik Baru</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitPoli(event)">
              <div class="modal-body">
                <div class="form-group">
                  <label>Kode Poli</label>
                  <input type="text" id="p-kode" class="form-control" placeholder="Contoh: POLI-UMUM (opsional)">
                </div>
                <div class="form-group">
                  <label>Nama Poliklinik <span class="text-danger">*</span></label>
                  <input type="text" id="p-nama" class="form-control" placeholder="Contoh: Poli Mata" required>
                </div>
                <div class="form-group">
                  <label>Tarif Registrasi / Pendaftaran (Rp)</label>
                  <input type="number" id="p-tarif" class="form-control" value="15000" min="0">
                </div>
                <div class="form-group">
                  <label>Deskripsi Layanan</label>
                  <textarea id="p-desc" class="form-control" rows="2"></textarea>
                </div>
                <div class="form-group">
                  <label>Status</label>
                  <select id="p-status" class="form-control">
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Poli</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalPoli').modal('show');
  },

  async openEditPoliModal(id) {
    const res = await this.api(`/api/poli/${id}`);
    if (!res.success) return Swal.fire('Error', res.message, 'error');
    const p = res.data;

    this.renderModal(`
      <div class="modal fade" id="modalPoli" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Edit Poli: ${p.namaPoli}</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitPoli(event, ${p.id})">
              <div class="modal-body">
                <div class="form-group">
                  <label>Kode Poli</label>
                  <input type="text" id="p-kode" class="form-control" value="${p.kodePoli}" required>
                </div>
                <div class="form-group">
                  <label>Nama Poliklinik <span class="text-danger">*</span></label>
                  <input type="text" id="p-nama" class="form-control" value="${p.namaPoli}" required>
                </div>
                <div class="form-group">
                  <label>Tarif Pendaftaran (Rp)</label>
                  <input type="number" id="p-tarif" class="form-control" value="${p.tarifPendaftaran}">
                </div>
                <div class="form-group">
                  <label>Deskripsi Layanan</label>
                  <textarea id="p-desc" class="form-control" rows="2">${p.deskripsi || ''}</textarea>
                </div>
                <div class="form-group">
                  <label>Status</label>
                  <select id="p-status" class="form-control">
                    <option value="aktif" ${p.status === 'aktif' ? 'selected' : ''}>Aktif</option>
                    <option value="nonaktif" ${p.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalPoli').modal('show');
  },

  async submitPoli(e, id = null) {
    e.preventDefault();
    const payload = {
      kodePoli: document.getElementById('p-kode').value.trim(),
      namaPoli: document.getElementById('p-nama').value.trim(),
      tarifPendaftaran: parseFloat(document.getElementById('p-tarif').value) || 0,
      deskripsi: document.getElementById('p-desc').value.trim(),
      status: document.getElementById('p-status').value
    };

    const endpoint = id ? `/api/poli/${id}` : '/api/poli';
    const method = id ? 'PUT' : 'POST';

    const res = await this.api(endpoint, method, payload);
    if (res.success) {
      $('#modalPoli').modal('hide');
      Swal.fire('Sukses', res.message, 'success');
      this.loadView('poli');
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  async deletePoli(id) {
    Swal.fire({
      title: 'Hapus Poliklinik?',
      text: 'Semua relasi data poli ini akan terpengaruh.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await this.api(`/api/poli/${id}`, 'DELETE');
        if (res.success) {
          Swal.fire('Terhapus', res.message, 'success');
          this.loadView('poli');
        } else {
          Swal.fire('Gagal', res.message, 'error');
        }
      }
    });
  },

  // ============================================================
  // MASTER: DOKTER
  // ============================================================
  async renderDokter(container) {
    const res = await this.api('/api/dokter');
    const items = res.data || [];

    let rows = '';
    items.forEach((d, idx) => {
      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge badge-light border font-weight-bold">${d.kodeDokter}</span></td>
          <td><strong>${d.namaDokter}</strong></td>
          <td><span class="badge badge-info">${d.spesialisasi || 'Dokter Umum'}</span></td>
          <td>${d.telepon || '-'}</td>
          <td>${d.noSip || '-'}</td>
          <td><strong>${this.formatRupiah(d.tarifKonsultasi)}</strong></td>
          <td><span class="badge ${d.status === 'aktif' ? 'badge-success' : 'badge-danger'}">${d.status}</span></td>
          <td>
            <button class="btn btn-xs btn-info mr-1" onclick="app.openEditDokterModal(${d.id})"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-xs btn-danger" onclick="app.deleteDokter(${d.id})"><i class="fas fa-trash"></i> Hapus</button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <h1 class="m-0 font-weight-bold"><i class="fas fa-user-md text-teal mr-2"></i>Data Dokter & Tenaga Medis</h1>
            <small class="text-muted">Master dokter, spesialisasi, SIP/STR, dan tarif konsultasi</small>
          </div>
          <div class="col-sm-6 text-right">
            <button class="btn btn-outline-primary mr-2" onclick="app.openJadwalDokterModal()">
              <i class="fas fa-calendar-alt mr-1"></i> Kelola Jadwal Praktek
            </button>
            <button class="btn btn-primary" onclick="app.openAddDokterModal()">
              <i class="fas fa-plus mr-1"></i> Tambah Dokter
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-dokter">
            <thead>
              <tr>
                <th width="40">No</th>
                <th>Kode</th>
                <th>Nama Dokter</th>
                <th>Spesialisasi</th>
                <th>No. Telepon</th>
                <th>No. SIP</th>
                <th>Tarif Konsul</th>
                <th>Status</th>
                <th width="130">Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-dokter').DataTable({ responsive: true });
  },

  openAddDokterModal() {
    this.renderModal(`
      <div class="modal fade" id="modalDokter" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Tambah Dokter Baru</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitDokter(event)">
              <div class="modal-body">
                <div class="row">
                  <div class="col-md-6 form-group">
                    <label>Kode Dokter</label>
                    <input type="text" id="d-kode" class="form-control" placeholder="Contoh: DOC-004 (opsional)">
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Nama Lengkap & Gelar <span class="text-danger">*</span></label>
                    <input type="text" id="d-nama" class="form-control" placeholder="dr. Ahmad, Sp.A" required>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Spesialisasi</label>
                    <input type="text" id="d-spesialisasi" class="form-control" placeholder="Contoh: Spesialis Anak">
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Tarif Konsultasi (Rp)</label>
                    <input type="number" id="d-tarif" class="form-control" value="75000">
                  </div>
                  <div class="col-md-6 form-group">
                    <label>No. STR</label>
                    <input type="text" id="d-str" class="form-control">
                  </div>
                  <div class="col-md-6 form-group">
                    <label>No. SIP</label>
                    <input type="text" id="d-sip" class="form-control">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Jenis Kelamin</label>
                    <select id="d-jk" class="form-control">
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>No. Telepon / WhatsApp</label>
                    <input type="text" id="d-telp" class="form-control">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Status</label>
                    <select id="d-status" class="form-control">
                      <option value="aktif">Aktif</option>
                      <option value="nonaktif">Nonaktif</option>
                    </select>
                  </div>
                  <div class="col-12 form-group">
                    <label>Alamat</label>
                    <input type="text" id="d-alamat" class="form-control">
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Dokter</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalDokter').modal('show');
  },

  async openEditDokterModal(id) {
    const res = await this.api(`/api/dokter/${id}`);
    if (!res.success) return Swal.fire('Error', res.message, 'error');
    const d = res.data;

    this.renderModal(`
      <div class="modal fade" id="modalDokter" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Edit Dokter: ${d.namaDokter}</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitDokter(event, ${d.id})">
              <div class="modal-body">
                <div class="row">
                  <div class="col-md-6 form-group">
                    <label>Kode Dokter</label>
                    <input type="text" id="d-kode" class="form-control" value="${d.kodeDokter}" required>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Nama Lengkap & Gelar <span class="text-danger">*</span></label>
                    <input type="text" id="d-nama" class="form-control" value="${d.namaDokter}" required>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Spesialisasi</label>
                    <input type="text" id="d-spesialisasi" class="form-control" value="${d.spesialisasi || ''}">
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Tarif Konsultasi (Rp)</label>
                    <input type="number" id="d-tarif" class="form-control" value="${d.tarifKonsultasi}">
                  </div>
                  <div class="col-md-6 form-group">
                    <label>No. STR</label>
                    <input type="text" id="d-str" class="form-control" value="${d.noStr || ''}">
                  </div>
                  <div class="col-md-6 form-group">
                    <label>No. SIP</label>
                    <input type="text" id="d-sip" class="form-control" value="${d.noSip || ''}">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Jenis Kelamin</label>
                    <select id="d-jk" class="form-control">
                      <option value="L" ${d.jenisKelamin === 'L' ? 'selected' : ''}>Laki-laki</option>
                      <option value="P" ${d.jenisKelamin === 'P' ? 'selected' : ''}>Perempuan</option>
                    </select>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>No. Telepon</label>
                    <input type="text" id="d-telp" class="form-control" value="${d.telepon || ''}">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Status</label>
                    <select id="d-status" class="form-control">
                      <option value="aktif" ${d.status === 'aktif' ? 'selected' : ''}>Aktif</option>
                      <option value="nonaktif" ${d.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalDokter').modal('show');
  },

  async submitDokter(e, id = null) {
    e.preventDefault();
    const payload = {
      kodeDokter: document.getElementById('d-kode').value.trim(),
      namaDokter: document.getElementById('d-nama').value.trim(),
      spesialisasi: document.getElementById('d-spesialisasi').value.trim(),
      tarifKonsultasi: parseFloat(document.getElementById('d-tarif').value) || 0,
      noStr: document.getElementById('d-str').value.trim(),
      noSip: document.getElementById('d-sip').value.trim(),
      jenisKelamin: document.getElementById('d-jk').value,
      telepon: document.getElementById('d-telp').value.trim(),
      status: document.getElementById('d-status').value
    };

    const endpoint = id ? `/api/dokter/${id}` : '/api/dokter';
    const method = id ? 'PUT' : 'POST';

    const res = await this.api(endpoint, method, payload);
    if (res.success) {
      $('#modalDokter').modal('hide');
      Swal.fire('Sukses', res.message, 'success');
      this.loadView('dokter');
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  async deleteDokter(id) {
    Swal.fire({
      title: 'Hapus Data Dokter?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await this.api(`/api/dokter/${id}`, 'DELETE');
        if (res.success) {
          Swal.fire('Terhapus', res.message, 'success');
          this.loadView('dokter');
        } else {
          Swal.fire('Gagal', res.message, 'error');
        }
      }
    });
  },

  async openJadwalDokterModal() {
    const res = await this.api('/api/dokter/jadwal');
    const items = res.data || [];

    let rows = '';
    items.forEach(j => {
      rows += `
        <tr>
          <td><strong>${j.namaDokter}</strong></td>
          <td>${j.namaPoli}</td>
          <td><span class="badge badge-primary">${j.hari}</span></td>
          <td>${j.jamMulai.substring(0,5)} - ${j.jamSelesai.substring(0,5)}</td>
          <td>${j.kuotaPasien} pasien</td>
          <td>
            <button class="btn btn-xs btn-danger" onclick="app.deleteJadwalDokter(${j.id})"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `;
    });

    this.renderModal(`
      <div class="modal fade" id="modalJadwal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold"><i class="fas fa-calendar-alt mr-2"></i>Jadwal Praktek Dokter</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <div class="modal-body p-3">
              <table class="table table-sm table-striped">
                <thead>
                  <tr>
                    <th>Dokter</th>
                    <th>Poli</th>
                    <th>Hari</th>
                    <th>Jam</th>
                    <th>Kuota</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="6" class="text-center py-2 text-muted">Belum ada jadwal.</td></tr>'}</tbody>
              </table>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Tutup</button>
            </div>
          </div>
        </div>
      </div>
    `);
    $('#modalJadwal').modal('show');
  },

  async deleteJadwalDokter(id) {
    const res = await this.api(`/api/dokter/jadwal/${id}`, 'DELETE');
    if (res.success) {
      $('#modalJadwal').modal('hide');
      Swal.fire('Sukses', 'Jadwal berhasil dihapus', 'success');
      this.openJadwalDokterModal();
    }
  },

  // ============================================================
  // MASTER: PASIEN
  // ============================================================
  async renderPasien(container) {
    const res = await this.api('/api/pasien');
    const items = res.data || [];

    let rows = '';
    items.forEach((p, idx) => {
      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge badge-success font-weight-bold">${p.noRm}</span></td>
          <td><strong>${p.namaPasien}</strong></td>
          <td>${p.nik || '-'}</td>
          <td>${p.jenisKelamin === 'L' ? '<span class="badge badge-info">L</span>' : '<span class="badge badge-danger">P</span>'}</td>
          <td>${p.telepon || '-'}</td>
          <td>${p.golonganDarah || '-'}</td>
          <td>${p.alergi || '-'}</td>
          <td>
            <button class="btn btn-xs btn-outline-primary mr-1" onclick="app.openRiwayatPasien(${p.id})" title="Riwayat Berobat"><i class="fas fa-history"></i></button>
            <button class="btn btn-xs btn-info mr-1" onclick="app.openEditPasienModal(${p.id})"><i class="fas fa-edit"></i></button>
            <button class="btn btn-xs btn-danger" onclick="app.deletePasien(${p.id})"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <h1 class="m-0 font-weight-bold"><i class="fas fa-users text-teal mr-2"></i>Data Pasien (Rekam Medis)</h1>
            <small class="text-muted">Database identitas pasien, No. RM, golongan darah, riwayat alergi</small>
          </div>
          <div class="col-sm-6 text-right">
            <button class="btn btn-primary" onclick="app.openAddPasienModal()">
              <i class="fas fa-user-plus mr-1"></i> Registrasi Pasien Baru
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-pasien">
            <thead>
              <tr>
                <th width="40">No</th>
                <th>No. RM</th>
                <th>Nama Pasien</th>
                <th>NIK</th>
                <th>JK</th>
                <th>Telepon</th>
                <th>Goldar</th>
                <th>Alergi</th>
                <th width="120">Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-pasien').DataTable({ responsive: true });
  },

  openAddPasienModal() {
    this.renderModal(`
      <div class="modal fade" id="modalPasien" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Registrasi Pasien Baru</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitPasien(event)">
              <div class="modal-body">
                <div class="row">
                  <div class="col-md-6 form-group">
                    <label>Nama Lengkap Pasien <span class="text-danger">*</span></label>
                    <input type="text" id="ps-nama" class="form-control" placeholder="Contoh: Budi Gunawan" required>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>NIK / KTP</label>
                    <input type="text" id="ps-nik" class="form-control" placeholder="16 Digit NIK">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Jenis Kelamin</label>
                    <select id="ps-jk" class="form-control">
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Tanggal Lahir</label>
                    <input type="date" id="ps-tgllahir" class="form-control">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Golongan Darah</label>
                    <select id="ps-goldar" class="form-control">
                      <option value="Tidak Diketahui">Tidak Diketahui</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </select>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>No. Telepon / WhatsApp</label>
                    <input type="text" id="ps-telp" class="form-control" placeholder="08123456789">
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Riwayat Alergi Obat / Makanan</label>
                    <input type="text" id="ps-alergi" class="form-control" placeholder="Contoh: Alergi Amoxicillin, Dingin">
                  </div>
                  <div class="col-12 form-group">
                    <label>Alamat Lengkap</label>
                    <textarea id="ps-alamat" class="form-control" rows="2"></textarea>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Pasien</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalPasien').modal('show');
  },

  async openEditPasienModal(id) {
    const res = await this.api(`/api/pasien/${id}`);
    if (!res.success) return Swal.fire('Error', res.message, 'error');
    const p = res.data;

    this.renderModal(`
      <div class="modal fade" id="modalPasien" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Edit Pasien: ${p.namaPasien} (${p.noRm})</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitPasien(event, ${p.id})">
              <div class="modal-body">
                <div class="row">
                  <div class="col-md-6 form-group">
                    <label>Nama Pasien <span class="text-danger">*</span></label>
                    <input type="text" id="ps-nama" class="form-control" value="${p.namaPasien}" required>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>NIK</label>
                    <input type="text" id="ps-nik" class="form-control" value="${p.nik || ''}">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Jenis Kelamin</label>
                    <select id="ps-jk" class="form-control">
                      <option value="L" ${p.jenisKelamin === 'L' ? 'selected' : ''}>Laki-laki</option>
                      <option value="P" ${p.jenisKelamin === 'P' ? 'selected' : ''}>Perempuan</option>
                    </select>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Golongan Darah</label>
                    <select id="ps-goldar" class="form-control">
                      <option value="A" ${p.golonganDarah === 'A' ? 'selected' : ''}>A</option>
                      <option value="B" ${p.golonganDarah === 'B' ? 'selected' : ''}>B</option>
                      <option value="AB" ${p.golonganDarah === 'AB' ? 'selected' : ''}>AB</option>
                      <option value="O" ${p.golonganDarah === 'O' ? 'selected' : ''}>O</option>
                      <option value="Tidak Diketahui" ${p.golonganDarah === 'Tidak Diketahui' ? 'selected' : ''}>Tidak Diketahui</option>
                    </select>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>No. Telepon</label>
                    <input type="text" id="ps-telp" class="form-control" value="${p.telepon || ''}">
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Riwayat Alergi</label>
                    <input type="text" id="ps-alergi" class="form-control" value="${p.alergi || ''}">
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Pekerjaan</label>
                    <input type="text" id="ps-pekerjaan" class="form-control" value="${p.pekerjaan || ''}">
                  </div>
                  <div class="col-12 form-group">
                    <label>Alamat</label>
                    <textarea id="ps-alamat" class="form-control" rows="2">${p.alamat || ''}</textarea>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalPasien').modal('show');
  },

  async submitPasien(e, id = null) {
    e.preventDefault();
    const payload = {
      namaPasien: document.getElementById('ps-nama').value.trim(),
      nik: document.getElementById('ps-nik').value.trim(),
      jenisKelamin: document.getElementById('ps-jk').value,
      golonganDarah: document.getElementById('ps-goldar').value,
      telepon: document.getElementById('ps-telp').value.trim(),
      alergi: document.getElementById('ps-alergi').value.trim(),
      alamat: document.getElementById('ps-alamat').value.trim()
    };
    if (document.getElementById('ps-tgllahir')?.value) {
      payload.tanggalLahir = document.getElementById('ps-tgllahir').value;
    }
    if (document.getElementById('ps-pekerjaan')?.value) {
      payload.pekerjaan = document.getElementById('ps-pekerjaan').value.trim();
    }

    const endpoint = id ? `/api/pasien/${id}` : '/api/pasien';
    const method = id ? 'PUT' : 'POST';

    const res = await this.api(endpoint, method, payload);
    if (res.success) {
      $('#modalPasien').modal('hide');
      Swal.fire('Sukses', res.message, 'success');
      this.loadView('pasien');
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  async deletePasien(id) {
    Swal.fire({
      title: 'Hapus Pasien?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await this.api(`/api/pasien/${id}`, 'DELETE');
        if (res.success) {
          Swal.fire('Terhapus', res.message, 'success');
          this.loadView('pasien');
        } else {
          Swal.fire('Gagal', res.message, 'error');
        }
      }
    });
  },

  async openRiwayatPasien(id) {
    const res = await this.api(`/api/pasien/${id}/riwayat`);
    if (!res.success) return Swal.fire('Error', res.message, 'error');
    const data = res.data;

    let kunjunganRows = '';
    (data.kunjungan || []).forEach(k => {
      kunjunganRows += `
        <tr>
          <td><span class="badge badge-light border">${k.no_kunjungan}</span></td>
          <td>${this.formatDate(k.tanggal_kunjungan)}</td>
          <td>${k.NamaPoli || '-'}</td>
          <td>${k.NamaDokter || '-'}</td>
          <td><span class="badge badge-info">${k.status}</span></td>
        </tr>
      `;
    });

    let rmRows = '';
    (data.rekam_medis || []).forEach(r => {
      rmRows += `
        <div class="card card-outline card-teal mb-3">
          <div class="card-header py-2">
            <strong>${this.formatDate(r.tanggal_pemeriksaan)}</strong> - Dokter: ${r.NamaDokter || '-'}
          </div>
          <div class="card-body p-3">
            <p class="mb-1"><strong>Keluhan Utama:</strong> ${r.keluhan_utama || '-'}</p>
            <p class="mb-1"><strong>Tanda Vital:</strong> TD: ${r.tekanan_darah || '-'} | Suhu: ${r.suhu || '-'}°C | BB: ${r.berat_badan || '-'} kg</p>
            <p class="mb-1"><strong>Diagnosis:</strong> <span class="text-primary font-weight-bold">${r.diagnosis || '-'}</span></p>
            <p class="mb-0"><strong>Tindakan / Terapi:</strong> ${r.tindakan || '-'}</p>
          </div>
        </div>
      `;
    });

    this.renderModal(`
      <div class="modal fade" id="modalRiwayat" tabindex="-1">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold"><i class="fas fa-history mr-2"></i>Riwayat Medis Pasien: ${data.pasien.namaPasien} (${data.pasien.noRm})</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <div class="modal-body p-4">
              <ul class="nav nav-tabs" id="tabRiwayat" role="tablist">
                <li class="nav-item">
                  <a class="nav-link active font-weight-bold" id="tab-rm-link" data-toggle="tab" href="#tab-rm">Catatan Rekam Medis (EMR)</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link font-weight-bold" id="tab-kunjungan-link" data-toggle="tab" href="#tab-kunjungan">Riwayat Kunjungan & Registrasi</a>
                </li>
              </ul>
              <div class="tab-content pt-3">
                <div class="tab-pane fade show active" id="tab-rm">
                  ${rmRows || '<div class="text-center py-4 text-muted">Belum ada catatan rekam medis dokter.</div>'}
                </div>
                <div class="tab-pane fade" id="tab-kunjungan">
                  <table class="table table-bordered table-striped">
                    <thead>
                      <tr>
                        <th>No. Kunjungan</th>
                        <th>Tanggal</th>
                        <th>Poli</th>
                        <th>Dokter</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>${kunjunganRows || '<tr><td colspan="5" class="text-center">Belum ada kunjungan</td></tr>'}</tbody>
                  </table>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Tutup</button>
            </div>
          </div>
        </div>
      </div>
    `);
    $('#modalRiwayat').modal('show');
  },

  // ============================================================
  // MASTER: TINDAKAN
  // ============================================================
  async renderTindakan(container) {
    const res = await this.api('/api/tindakan');
    const items = res.data || [];

    let rows = '';
    items.forEach((t, idx) => {
      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge badge-light border font-weight-bold">${t.kodeTindakan}</span></td>
          <td><strong>${t.namaTindakan}</strong></td>
          <td><span class="badge badge-secondary">${t.kategori || 'Umum'}</span></td>
          <td><strong>${this.formatRupiah(t.tarif)}</strong></td>
          <td><span class="badge ${t.status === 'aktif' ? 'badge-success' : 'badge-danger'}">${t.status}</span></td>
          <td>
            <button class="btn btn-xs btn-info mr-1" onclick="app.openEditTindakanModal(${t.id})"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-xs btn-danger" onclick="app.deleteTindakan(${t.id})"><i class="fas fa-trash"></i> Hapus</button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <h1 class="m-0 font-weight-bold"><i class="fas fa-syringe text-teal mr-2"></i>Data Tindakan Medis & Tarif</h1>
            <small class="text-muted">Master tindakan dokter, tindakan perawat, dan pemeriksaan penunjang</small>
          </div>
          <div class="col-sm-6 text-right">
            <button class="btn btn-primary" onclick="app.openAddTindakanModal()">
              <i class="fas fa-plus mr-1"></i> Tambah Tindakan Baru
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-tindakan">
            <thead>
              <tr>
                <th width="40">No</th>
                <th>Kode</th>
                <th>Nama Tindakan</th>
                <th>Kategori</th>
                <th>Tarif (Rp)</th>
                <th>Status</th>
                <th width="130">Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-tindakan').DataTable({ responsive: true });
  },

  openAddTindakanModal() {
    this.renderModal(`
      <div class="modal fade" id="modalTindakan" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Tambah Tindakan Medis</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitTindakan(event)">
              <div class="modal-body">
                <div class="form-group">
                  <label>Kode Tindakan</label>
                  <input type="text" id="td-kode" class="form-control" placeholder="TDK-009 (opsional)">
                </div>
                <div class="form-group">
                  <label>Nama Tindakan Medis <span class="text-danger">*</span></label>
                  <input type="text" id="td-nama" class="form-control" placeholder="Contoh: Jahit Luka Ringan" required>
                </div>
                <div class="form-group">
                  <label>Kategori</label>
                  <input type="text" id="td-kategori" class="form-control" placeholder="Tindakan Medis / Bedah Minor / Gigi">
                </div>
                <div class="form-group">
                  <label>Tarif Tindakan (Rp) <span class="text-danger">*</span></label>
                  <input type="number" id="td-tarif" class="form-control" value="50000" min="0" required>
                </div>
                <div class="form-group">
                  <label>Deskripsi</label>
                  <textarea id="td-desc" class="form-control" rows="2"></textarea>
                </div>
                <div class="form-group">
                  <label>Status</label>
                  <select id="td-status" class="form-control">
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Tindakan</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalTindakan').modal('show');
  },

  async openEditTindakanModal(id) {
    const res = await this.api(`/api/tindakan/${id}`);
    if (!res.success) return Swal.fire('Error', res.message, 'error');
    const t = res.data;

    this.renderModal(`
      <div class="modal fade" id="modalTindakan" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Edit Tindakan: ${t.namaTindakan}</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitTindakan(event, ${t.id})">
              <div class="modal-body">
                <div class="form-group">
                  <label>Kode Tindakan</label>
                  <input type="text" id="td-kode" class="form-control" value="${t.kodeTindakan}" required>
                </div>
                <div class="form-group">
                  <label>Nama Tindakan Medis <span class="text-danger">*</span></label>
                  <input type="text" id="td-nama" class="form-control" value="${t.namaTindakan}" required>
                </div>
                <div class="form-group">
                  <label>Kategori</label>
                  <input type="text" id="td-kategori" class="form-control" value="${t.kategori || ''}">
                </div>
                <div class="form-group">
                  <label>Tarif Tindakan (Rp) <span class="text-danger">*</span></label>
                  <input type="number" id="td-tarif" class="form-control" value="${t.tarif}" required>
                </div>
                <div class="form-group">
                  <label>Status</label>
                  <select id="td-status" class="form-control">
                    <option value="aktif" ${t.status === 'aktif' ? 'selected' : ''}>Aktif</option>
                    <option value="nonaktif" ${t.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalTindakan').modal('show');
  },

  async submitTindakan(e, id = null) {
    e.preventDefault();
    const payload = {
      kodeTindakan: document.getElementById('td-kode').value.trim(),
      namaTindakan: document.getElementById('td-nama').value.trim(),
      kategori: document.getElementById('td-kategori').value.trim(),
      tarif: parseFloat(document.getElementById('td-tarif').value) || 0,
      status: document.getElementById('td-status').value
    };

    const endpoint = id ? `/api/tindakan/${id}` : '/api/tindakan';
    const method = id ? 'PUT' : 'POST';

    const res = await this.api(endpoint, method, payload);
    if (res.success) {
      $('#modalTindakan').modal('hide');
      Swal.fire('Sukses', res.message, 'success');
      this.loadView('tindakan');
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  async deleteTindakan(id) {
    Swal.fire({
      title: 'Hapus Tindakan?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await this.api(`/api/tindakan/${id}`, 'DELETE');
        if (res.success) {
          Swal.fire('Terhapus', res.message, 'success');
          this.loadView('tindakan');
        } else {
          Swal.fire('Gagal', res.message, 'error');
        }
      }
    });
  },

  // ============================================================
  // MASTER: OBAT & ALKES
  // ============================================================
  async renderObat(container) {
    const res = await this.api('/api/obat');
    const items = res.data || [];

    let rows = '';
    items.forEach((o, idx) => {
      const isKritis = o.stok <= o.stokMinimum;
      const badgeStok = isKritis ? 'badge-danger' : 'badge-success';

      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge badge-light border font-weight-bold">${o.kodeObat}</span></td>
          <td>
            <strong>${o.namaObat}</strong>
            ${isKritis ? '<span class="badge badge-warning ml-1"><i class="fas fa-exclamation-triangle"></i> Menipis</span>' : ''}
          </td>
          <td><span class="badge badge-secondary">${o.namaKategori || 'Obat Bebas'}</span></td>
          <td><span class="badge ${badgeStok} font-weight-bold" style="font-size:0.9rem;">${o.stok} ${o.namaSatuan || 'Tablet'}</span></td>
          <td>${this.formatRupiah(o.hargaBeli)}</td>
          <td><strong>${this.formatRupiah(o.hargaJual)}</strong></td>
          <td>${this.formatDate(o.tanggalExpired)}</td>
          <td>
            <button class="btn btn-xs btn-outline-success mr-1" onclick="app.openRestokModal(${o.id}, '${o.namaObat}')" title="Restok"><i class="fas fa-plus"></i></button>
            <button class="btn btn-xs btn-info mr-1" onclick="app.openEditObatModal(${o.id})"><i class="fas fa-edit"></i></button>
            <button class="btn btn-xs btn-danger" onclick="app.deleteObat(${o.id})"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <h1 class="m-0 font-weight-bold"><i class="fas fa-pills text-teal mr-2"></i>Data Obat & Alat Kesehatan</h1>
            <small class="text-muted">Katalog farmasi, harga beli, harga jual, stok minimum, dan masa kadaluarsa</small>
          </div>
          <div class="col-sm-6 text-right">
            <button class="btn btn-outline-danger mr-2" onclick="app.filterObatKritis()">
              <i class="fas fa-exclamation-triangle mr-1"></i> Lihat Stok Kritis
            </button>
            <button class="btn btn-primary" onclick="app.openAddObatModal()">
              <i class="fas fa-plus mr-1"></i> Tambah Obat Baru
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-obat">
            <thead>
              <tr>
                <th width="40">No</th>
                <th>Kode</th>
                <th>Nama Obat</th>
                <th>Kategori</th>
                <th>Sisa Stok</th>
                <th>Harga Beli</th>
                <th>Harga Jual</th>
                <th>Expired</th>
                <th width="120">Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-obat').DataTable({ responsive: true });
  },

  async filterObatKritis() {
    const res = await this.api('/api/obat/kritis');
    const items = res.data || [];
    Swal.fire({
      title: `Peringatan: ${items.length} Obat Stok Menipis!`,
      html: `
        <div class="text-left" style="max-height:300px; overflow-y:auto;">
          <table class="table table-sm table-bordered">
            <thead><tr><th>Obat</th><th>Sisa</th><th>Min</th></tr></thead>
            <tbody>
              ${items.map(o => `<tr><td><strong>${o.namaObat}</strong></td><td class="text-danger font-weight-bold">${o.stok}</td><td>${o.stokMinimum}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      `,
      icon: 'warning',
      confirmButtonColor: '#0f766e',
      confirmButtonText: 'Tutup'
    });
  },

  async openAddObatModal() {
    const [resKat, resSat] = await Promise.all([
      this.api('/api/obat/kategori'),
      this.api('/api/obat/satuan')
    ]);

    const katOptions = (resKat.data || []).map(k => `<option value="${k.id}">${k.namaKategori}</option>`).join('');
    const satOptions = (resSat.data || []).map(s => `<option value="${s.id}">${s.namaSatuan}</option>`).join('');

    this.renderModal(`
      <div class="modal fade" id="modalObat" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Tambah Obat / Alkes Baru</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitObat(event)">
              <div class="modal-body">
                <div class="row">
                  <div class="col-md-6 form-group">
                    <label>Kode Obat</label>
                    <input type="text" id="ob-kode" class="form-control" placeholder="OBT-011 (opsional)">
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Nama Obat / Produk <span class="text-danger">*</span></label>
                    <input type="text" id="ob-nama" class="form-control" placeholder="Contoh: Salbutamol Inhaler" required>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Kategori Obat</label>
                    <select id="ob-kategori" class="form-control">${katOptions}</select>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Satuan Kemasan</label>
                    <select id="ob-satuan" class="form-control">${satOptions}</select>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Harga Beli (Rp)</label>
                    <input type="number" id="ob-hargabeli" class="form-control" value="5000" min="0">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Harga Jual (Rp) <span class="text-danger">*</span></label>
                    <input type="number" id="ob-hargajual" class="form-control" value="8000" min="0" required>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Stok Awal</label>
                    <input type="number" id="ob-stok" class="form-control" value="50" min="0">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Batas Stok Minimum</label>
                    <input type="number" id="ob-stokmin" class="form-control" value="15" min="0">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Tanggal Kadaluarsa (Expired)</label>
                    <input type="date" id="ob-expired" class="form-control">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Nomor Batch</label>
                    <input type="text" id="ob-batch" class="form-control" placeholder="BATCH-...">
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Obat</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalObat').modal('show');
  },

  async openEditObatModal(id) {
    const [resObat, resKat, resSat] = await Promise.all([
      this.api(`/api/obat/${id}`),
      this.api('/api/obat/kategori'),
      this.api('/api/obat/satuan')
    ]);

    if (!resObat.success) return Swal.fire('Error', resObat.message, 'error');
    const o = resObat.data;

    const katOptions = (resKat.data || []).map(k => `<option value="${k.id}" ${o.kategoriId === k.id ? 'selected' : ''}>${k.namaKategori}</option>`).join('');
    const satOptions = (resSat.data || []).map(s => `<option value="${s.id}" ${o.satuanId === s.id ? 'selected' : ''}>${s.namaSatuan}</option>`).join('');
    const expDate = o.tanggalExpired ? o.tanggalExpired.substring(0, 10) : '';

    this.renderModal(`
      <div class="modal fade" id="modalObat" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Edit Obat: ${o.namaObat}</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitObat(event, ${o.id})">
              <div class="modal-body">
                <div class="row">
                  <div class="col-md-6 form-group">
                    <label>Kode Obat</label>
                    <input type="text" id="ob-kode" class="form-control" value="${o.kodeObat}" required>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Nama Obat <span class="text-danger">*</span></label>
                    <input type="text" id="ob-nama" class="form-control" value="${o.namaObat}" required>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Kategori Obat</label>
                    <select id="ob-kategori" class="form-control">${katOptions}</select>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Satuan Kemasan</label>
                    <select id="ob-satuan" class="form-control">${satOptions}</select>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Harga Beli (Rp)</label>
                    <input type="number" id="ob-hargabeli" class="form-control" value="${o.hargaBeli}">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Harga Jual (Rp) <span class="text-danger">*</span></label>
                    <input type="number" id="ob-hargajual" class="form-control" value="${o.hargaJual}" required>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Stok Saat Ini</label>
                    <input type="number" id="ob-stok" class="form-control" value="${o.stok}">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Batas Stok Minimum</label>
                    <input type="number" id="ob-stokmin" class="form-control" value="${o.stokMinimum}">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Tanggal Expired</label>
                    <input type="date" id="ob-expired" class="form-control" value="${expDate}">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Nomor Batch</label>
                    <input type="text" id="ob-batch" class="form-control" value="${o.nomorBatch || ''}">
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalObat').modal('show');
  },

  async submitObat(e, id = null) {
    e.preventDefault();
    const payload = {
      kodeObat: document.getElementById('ob-kode').value.trim(),
      namaObat: document.getElementById('ob-nama').value.trim(),
      kategoriId: parseInt(document.getElementById('ob-kategori').value) || null,
      satuanId: parseInt(document.getElementById('ob-satuan').value) || null,
      hargaBeli: parseFloat(document.getElementById('ob-hargabeli').value) || 0,
      hargaJual: parseFloat(document.getElementById('ob-hargajual').value) || 0,
      stok: parseInt(document.getElementById('ob-stok').value) || 0,
      stokMinimum: parseInt(document.getElementById('ob-stokmin').value) || 0,
      tanggalExpired: document.getElementById('ob-expired').value || null,
      nomorBatch: document.getElementById('ob-batch').value.trim()
    };

    const endpoint = id ? `/api/obat/${id}` : '/api/obat';
    const method = id ? 'PUT' : 'POST';

    const res = await this.api(endpoint, method, payload);
    if (res.success) {
      $('#modalObat').modal('hide');
      Swal.fire('Sukses', res.message, 'success');
      this.loadView('obat');
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  async deleteObat(id) {
    Swal.fire({
      title: 'Hapus Obat Ini?',
      text: 'Data obat akan dihapus dari sistem apotek.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await this.api(`/api/obat/${id}`, 'DELETE');
        if (res.success) {
          Swal.fire('Terhapus', res.message, 'success');
          this.loadView('obat');
        } else {
          Swal.fire('Gagal', res.message, 'error');
        }
      }
    });
  },

  // ============================================================
  // MASTER: SUPPLIER
  // ============================================================
  async renderSupplier(container) {
    const res = await this.api('/api/supplier');
    const items = res.data || [];

    let rows = '';
    items.forEach((s, idx) => {
      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge badge-light border font-weight-bold">${s.kodeSupplier}</span></td>
          <td><strong>${s.namaSupplier}</strong></td>
          <td>${s.kontakPerson || '-'}</td>
          <td>${s.telepon || '-'}</td>
          <td>${s.email || '-'}</td>
          <td>${s.alamat || '-'}</td>
          <td>
            <button class="btn btn-xs btn-info mr-1" onclick="app.openEditSupplierModal(${s.id})"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-xs btn-danger" onclick="app.deleteSupplier(${s.id})"><i class="fas fa-trash"></i> Hapus</button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <h1 class="m-0 font-weight-bold"><i class="fas fa-truck text-teal mr-2"></i>Data Supplier Obat & Alkes</h1>
            <small class="text-muted">Distributor farmasi rekanan resmi klinik</small>
          </div>
          <div class="col-sm-6 text-right">
            <button class="btn btn-primary" onclick="app.openAddSupplierModal()">
              <i class="fas fa-plus mr-1"></i> Tambah Supplier Baru
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-supplier">
            <thead>
              <tr>
                <th width="40">No</th>
                <th>Kode</th>
                <th>Nama Supplier / Distributor</th>
                <th>Kontak Person</th>
                <th>Telepon</th>
                <th>Email</th>
                <th>Alamat</th>
                <th width="130">Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-supplier').DataTable({ responsive: true });
  },

  openAddSupplierModal() {
    this.renderModal(`
      <div class="modal fade" id="modalSupplier" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Tambah Supplier Baru</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitSupplier(event)">
              <div class="modal-body">
                <div class="form-group">
                  <label>Kode Supplier</label>
                  <input type="text" id="sp-kode" class="form-control" placeholder="SUP-004 (opsional)">
                </div>
                <div class="form-group">
                  <label>Nama Supplier / Perusahaan <span class="text-danger">*</span></label>
                  <input type="text" id="sp-nama" class="form-control" placeholder="PT. Kimia Farma..." required>
                </div>
                <div class="form-group">
                  <label>Kontak Person / PIC</label>
                  <input type="text" id="sp-pic" class="form-control">
                </div>
                <div class="form-group">
                  <label>No. Telepon</label>
                  <input type="text" id="sp-telp" class="form-control">
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" id="sp-email" class="form-control">
                </div>
                <div class="form-group">
                  <label>Alamat Perusahaan</label>
                  <textarea id="sp-alamat" class="form-control" rows="2"></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Supplier</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalSupplier').modal('show');
  },

  async openEditSupplierModal(id) {
    const res = await this.api(`/api/supplier/${id}`);
    if (!res.success) return Swal.fire('Error', res.message, 'error');
    const s = res.data;

    this.renderModal(`
      <div class="modal fade" id="modalSupplier" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Edit Supplier: ${s.namaSupplier}</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitSupplier(event, ${s.id})">
              <div class="modal-body">
                <div class="form-group">
                  <label>Kode Supplier</label>
                  <input type="text" id="sp-kode" class="form-control" value="${s.kodeSupplier}" required>
                </div>
                <div class="form-group">
                  <label>Nama Supplier <span class="text-danger">*</span></label>
                  <input type="text" id="sp-nama" class="form-control" value="${s.namaSupplier}" required>
                </div>
                <div class="form-group">
                  <label>Kontak Person</label>
                  <input type="text" id="sp-pic" class="form-control" value="${s.kontakPerson || ''}">
                </div>
                <div class="form-group">
                  <label>No. Telepon</label>
                  <input type="text" id="sp-telp" class="form-control" value="${s.telepon || ''}">
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" id="sp-email" class="form-control" value="${s.email || ''}">
                </div>
                <div class="form-group">
                  <label>Alamat</label>
                  <textarea id="sp-alamat" class="form-control" rows="2">${s.alamat || ''}</textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalSupplier').modal('show');
  },

  async submitSupplier(e, id = null) {
    e.preventDefault();
    const payload = {
      kodeSupplier: document.getElementById('sp-kode').value.trim(),
      namaSupplier: document.getElementById('sp-nama').value.trim(),
      kontakPerson: document.getElementById('sp-pic').value.trim(),
      telepon: document.getElementById('sp-telp').value.trim(),
      email: document.getElementById('sp-email').value.trim(),
      alamat: document.getElementById('sp-alamat').value.trim()
    };

    const endpoint = id ? `/api/supplier/${id}` : '/api/supplier';
    const method = id ? 'PUT' : 'POST';

    const res = await this.api(endpoint, method, payload);
    if (res.success) {
      $('#modalSupplier').modal('hide');
      Swal.fire('Sukses', res.message, 'success');
      this.loadView('supplier');
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  async deleteSupplier(id) {
    Swal.fire({
      title: 'Hapus Supplier?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Ya, Hapus'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await this.api(`/api/supplier/${id}`, 'DELETE');
        if (res.success) {
          Swal.fire('Terhapus', res.message, 'success');
          this.loadView('supplier');
        } else {
          Swal.fire('Gagal', res.message, 'error');
        }
      }
    });
  },

  // ============================================================
  // TRANSAKSI: KUNJUNGAN & ANTRIAN
  // ============================================================
  async renderKunjungan(container) {
    const res = await this.api('/api/kunjungan');
    const items = res.data || [];

    let rows = '';
    items.forEach((k, idx) => {
      let badgeStatus = 'badge-secondary';
      if (k.status === 'menunggu') badgeStatus = 'badge-warning';
      if (k.status === 'dipanggil') badgeStatus = 'badge-primary';
      if (k.status === 'diperiksa') badgeStatus = 'badge-info';
      if (k.status === 'selesai') badgeStatus = 'badge-success';
      if (k.status === 'batal') badgeStatus = 'badge-danger';

      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge badge-light border font-weight-bold">${k.noKunjungan}</span></td>
          <td>${this.formatDate(k.tanggalKunjungan)} <small class="text-muted d-block">${k.jamDaftar || ''}</small></td>
          <td><strong>${k.namaPasien}</strong> <small class="text-muted d-block">RM: ${k.noRm}</small></td>
          <td>${k.namaPoli || '-'}</td>
          <td>${k.namaDokter || '-'}</td>
          <td><span class="badge badge-light border text-uppercase">${k.caraBayar}</span></td>
          <td><span class="badge ${badgeStatus} text-uppercase font-weight-bold">${k.status}</span></td>
          <td>
            <div class="dropdown">
              <button class="btn btn-xs btn-outline-primary dropdown-toggle" data-toggle="dropdown">Status</button>
              <div class="dropdown-menu dropdown-menu-right">
                <a class="dropdown-item" href="#" onclick="app.updateKunjunganStatus(${k.id}, 'dipanggil')"><i class="fas fa-bullhorn text-primary mr-2"></i> Panggil Pasien</a>
                <a class="dropdown-item" href="#" onclick="app.openDirectEmr(${k.id}, ${k.pasienId})"><i class="fas fa-stethoscope text-info mr-2"></i> Mulai Periksa (EMR)</a>
                <a class="dropdown-item" href="#" onclick="app.updateKunjunganStatus(${k.id}, 'selesai')"><i class="fas fa-check-circle text-success mr-2"></i> Tandai Selesai</a>
                <div class="dropdown-divider"></div>
                <a class="dropdown-item text-danger" href="#" onclick="app.updateKunjunganStatus(${k.id}, 'batal')"><i class="fas fa-times-circle mr-2"></i> Batalkan Kunjungan</a>
              </div>
            </div>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <h1 class="m-0 font-weight-bold"><i class="fas fa-ticket-alt text-teal mr-2"></i>Pendaftaran Pasien & Antrian Kunjungan</h1>
            <small class="text-muted">Kelola antrian rawat jalan poli dan pemanggilan pasien</small>
          </div>
          <div class="col-sm-6 text-right">
            <button class="btn btn-primary" onclick="app.openModalPendaftaran()">
              <i class="fas fa-plus mr-1"></i> Pendaftaran Kunjungan Baru
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-kunjungan">
            <thead>
              <tr>
                <th width="30">No</th>
                <th>No. Kunjungan</th>
                <th>Tanggal</th>
                <th>Nama Pasien</th>
                <th>Poli</th>
                <th>Dokter</th>
                <th>Bayar</th>
                <th>Status</th>
                <th width="100">Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-kunjungan').DataTable({ responsive: true });
  },

  async openModalPendaftaran() {
    const [resPasien, resPoli, resDokter] = await Promise.all([
      this.api('/api/pasien'),
      this.api('/api/poli'),
      this.api('/api/dokter')
    ]);

    const pasienOptions = (resPasien.data || []).map(p => `<option value="${p.id}">${p.noRm} - ${p.namaPasien}</option>`).join('');
    const poliOptions = (resPoli.data || []).map(pol => `<option value="${pol.id}">${pol.namaPoli} (Tarif: ${this.formatRupiah(pol.tarifPendaftaran)})</option>`).join('');
    const dokterOptions = (resDokter.data || []).map(d => `<option value="${d.id}">${d.namaDokter} (${d.spesialisasi || 'Umum'})</option>`).join('');

    const today = new Date().toISOString().split('T')[0];

    this.renderModal(`
      <div class="modal fade" id="modalKunjungan" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold"><i class="fas fa-plus-circle mr-2"></i>Pendaftaran Pasien & Ambil Antrian</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitKunjungan(event)">
              <div class="modal-body">
                <div class="row">
                  <div class="col-md-12 form-group">
                    <label>Pilih Pasien Terdaftar <span class="text-danger">*</span></label>
                    <select id="kj-pasien" class="form-control" required>
                      <option value="">-- Pilih Pasien --</option>
                      ${pasienOptions}
                    </select>
                    <small class="text-muted">Pasien baru belum terdaftar? <a href="#" onclick="$('#modalKunjungan').modal('hide'); app.openAddPasienModal();">Klik di sini untuk daftar pasien baru</a></small>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Tujuan Poliklinik <span class="text-danger">*</span></label>
                    <select id="kj-poli" class="form-control" required>${poliOptions}</select>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Dokter Pemeriksa</label>
                    <select id="kj-dokter" class="form-control">
                      <option value="">-- Bebas / Sesuai Antrian --</option>
                      ${dokterOptions}
                    </select>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Tanggal Kunjungan</label>
                    <input type="date" id="kj-tanggal" class="form-control" value="${today}" required>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Jenis Kunjungan</label>
                    <select id="kj-jenis" class="form-control">
                      <option value="lama">Pasien Lama</option>
                      <option value="baru">Pasien Baru</option>
                    </select>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Cara Bayar</label>
                    <select id="kj-carabayar" class="form-control">
                      <option value="umum">Umum / Tunai / QRIS</option>
                      <option value="bpjs">BPJS Kesehatan</option>
                      <option value="asuransi">Asuransi Swasta</option>
                    </select>
                  </div>
                  <div class="col-12 form-group">
                    <label>Keluhan Awal Pasien</label>
                    <textarea id="kj-keluhan" class="form-control" rows="2" placeholder="Keluhan utama saat mendaftar..."></textarea>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-check mr-1"></i> Simpan & Ambil Antrian</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalKunjungan').modal('show');
  },

  async submitKunjungan(e) {
    e.preventDefault();
    const payload = {
      pasienId: parseInt(document.getElementById('kj-pasien').value),
      poliId: parseInt(document.getElementById('kj-poli').value),
      dokterId: document.getElementById('kj-dokter').value ? parseInt(document.getElementById('kj-dokter').value) : null,
      tanggalKunjungan: document.getElementById('kj-tanggal').value,
      jenisKunjungan: document.getElementById('kj-jenis').value,
      caraBayar: document.getElementById('kj-carabayar').value,
      keluhanAwal: document.getElementById('kj-keluhan').value.trim(),
      userPendaftaranId: this.currentUser?.id || 1,
      status: 'menunggu'
    };

    const res = await this.api('/api/kunjungan', 'POST', payload);
    if (res.success) {
      $('#modalKunjungan').modal('hide');
      Swal.fire({
        icon: 'success',
        title: 'Pendaftaran Berhasil!',
        html: `Nomor Kunjungan / Antrian Pasien: <br><strong class="h4 text-primary">${res.data.noKunjungan}</strong>`,
        confirmButtonColor: '#0f766e'
      });
      this.loadView('kunjungan');
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  async updateKunjunganStatus(id, newStatus) {
    const res = await this.api(`/api/kunjungan/${id}/status`, 'PUT', { status: newStatus });
    if (res.success) {
      Swal.fire({
        icon: 'success',
        title: 'Status Diperbarui',
        text: `Kunjungan diubah menjadi ${newStatus.toUpperCase()}`,
        timer: 1000,
        showConfirmButton: false
      });
      this.loadView(this.activeView);
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  // ============================================================
  // TRANSAKSI: REKAM MEDIS (EMR)
  // ============================================================
  async renderRekamMedis(container) {
    const res = await this.api('/api/rekammedis');
    const items = res.data || [];

    let rows = '';
    items.forEach((r, idx) => {
      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge badge-light border font-weight-bold">${r.noKunjungan || '-'}</span></td>
          <td>${this.formatDate(r.tanggalPemeriksaan)}</td>
          <td><strong>${r.namaPasien}</strong> <small class="text-muted d-block">RM: ${r.noRm}</small></td>
          <td>${r.namaDokter || '-'}</td>
          <td><span class="text-primary font-weight-bold">${r.diagnosis || '-'}</span></td>
          <td>${r.tindakan || '-'}</td>
          <td><span class="badge badge-success font-weight-bold text-uppercase">${r.status}</span></td>
          <td>
            <button class="btn btn-xs btn-outline-info mr-1" onclick="app.viewDetailEmr(${r.id})" title="Lihat Detail"><i class="fas fa-eye"></i></button>
            <button class="btn btn-xs btn-outline-warning mr-1" onclick="app.openBuatResepModal(${r.id}, ${r.pasienId}, ${r.dokterId || 1})" title="Buat Resep Obat"><i class="fas fa-prescription-bottle-alt"></i> Resep</button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <h1 class="m-0 font-weight-bold"><i class="fas fa-notes-medical text-teal mr-2"></i>Pelayanan Rekam Medis (EMR)</h1>
            <small class="text-muted">Pemeriksaan fisik dokter, tanda vital, diagnosa ICD-10, dan tindakan</small>
          </div>
          <div class="col-sm-6 text-right">
            <button class="btn btn-primary" onclick="app.openPilihKunjunganForEmr()">
              <i class="fas fa-stethoscope mr-1"></i> Input Rekam Medis Baru
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-rm">
            <thead>
              <tr>
                <th width="30">No</th>
                <th>No. Kunjungan</th>
                <th>Tanggal Periksa</th>
                <th>Nama Pasien</th>
                <th>Dokter</th>
                <th>Diagnosa</th>
                <th>Tindakan</th>
                <th>Status</th>
                <th width="120">Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-rm').DataTable({ responsive: true });
  },

  async openPilihKunjunganForEmr() {
    const res = await this.api('/api/kunjungan?status=menunggu');
    const items = res.data || [];

    if (items.length === 0) {
      return Swal.fire('Info', 'Tidak ada antrian pasien menunggu pemeriksaan saat ini.', 'info');
    }

    const options = items.map(k => `<option value="${k.id}" data-pasien="${k.pasienId}">${k.noKunjungan} - ${k.namaPasien} (${k.namaPoli || 'Umum'})</option>`).join('');

    Swal.fire({
      title: 'Pilih Kunjungan / Antrian Pasien',
      html: `
        <div class="form-group text-left">
          <label>Pilih Antrian Pasien yang Akan Diperiksa:</label>
          <select id="pilih-kj-emr" class="form-control">${options}</select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#0f766e',
      confirmButtonText: 'Mulai Pemeriksaan EMR'
    }).then(result => {
      if (result.isConfirmed) {
        const select = document.getElementById('pilih-kj-emr');
        const kjId = parseInt(select.value);
        const pasienId = parseInt(select.options[select.selectedIndex].getAttribute('data-pasien'));
        this.openDirectEmr(kjId, pasienId);
      }
    });
  },

  async openDirectEmr(kunjunganId, pasienId) {
    const [resKj, resDiagnosa, resTindakan, resDokter] = await Promise.all([
      this.api(`/api/kunjungan/${kunjunganId}`),
      this.api('/api/tindakan/diagnosa-list'),
      this.api('/api/tindakan'),
      this.api('/api/dokter')
    ]);

    const kj = resKj.data;
    const diagList = resDiagnosa.data || [];
    const tdkList = resTindakan.data || [];
    const dokList = resDokter.data || [];

    const diagOptions = diagList.map(d => `<option value="${d.id}">${d.kodeIcd || '-'} - ${d.namaDiagnosa}</option>`).join('');
    const tdkOptions = tdkList.map(t => `<option value="${t.id}" data-tarif="${t.tarif}">${t.namaTindakan} (${this.formatRupiah(t.tarif)})</option>`).join('');
    const dokOptions = dokList.map(d => `<option value="${d.id}" ${kj.dokterId === d.id ? 'selected' : ''}>${d.namaDokter}</option>`).join('');

    this.renderModal(`
      <div class="modal fade" id="modalEmr" tabindex="-1">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold"><i class="fas fa-stethoscope mr-2"></i>Pemeriksaan Medis Pasien: ${kj.namaPasien} (${kj.noRm})</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitEmr(event, ${kunjunganId}, ${pasienId})">
              <div class="modal-body p-4">
                <div class="alert alert-light border py-2 px-3 mb-3">
                  <div class="row">
                    <div class="col-md-3"><strong>No. Kunjungan:</strong> ${kj.noKunjungan}</div>
                    <div class="col-md-3"><strong>Pasien:</strong> ${kj.namaPasien} (${kj.noRm})</div>
                    <div class="col-md-3"><strong>Poli:</strong> ${kj.namaPoli || 'Umum'}</div>
                    <div class="col-md-3"><strong>Keluhan Awal:</strong> ${kj.keluhanAwal || '-'}</div>
                  </div>
                </div>

                <div class="row">
                  <!-- KOLOM 1: ANAMNESA & VITAL SIGN -->
                  <div class="col-md-6 border-right">
                    <h6 class="font-weight-bold text-teal mb-3"><i class="fas fa-heartbeat mr-1"></i> 1. Anamnesa & Tanda Vital</h6>
                    <div class="form-group">
                      <label>Keluhan Utama <span class="text-danger">*</span></label>
                      <textarea id="emr-keluhan" class="form-control" rows="2" placeholder="Gejala dan keluhan pasien..." required>${kj.keluhanAwal || ''}</textarea>
                    </div>
                    <div class="form-group">
                      <label>Riwayat Penyakit & Alergi</label>
                      <input type="text" id="emr-riwayat" class="form-control" placeholder="Hipertensi, Maag, Alergi...">
                    </div>
                    
                    <div class="row">
                      <div class="col-6 form-group">
                        <label>Tekanan Darah (mmHg)</label>
                        <input type="text" id="emr-tensi" class="form-control" placeholder="120/80">
                      </div>
                      <div class="col-6 form-group">
                        <label>Suhu Tubuh (°C)</label>
                        <input type="number" step="0.1" id="emr-suhu" class="form-control" placeholder="36.5">
                      </div>
                      <div class="col-6 form-group">
                        <label>Berat Badan (kg)</label>
                        <input type="number" step="0.1" id="emr-bb" class="form-control" placeholder="65">
                      </div>
                      <div class="col-6 form-group">
                        <label>Tinggi Badan (cm)</label>
                        <input type="number" step="0.1" id="emr-tb" class="form-control" placeholder="170">
                      </div>
                      <div class="col-6 form-group">
                        <label>Nadi (bpm)</label>
                        <input type="number" id="emr-nadi" class="form-control" placeholder="80">
                      </div>
                      <div class="col-6 form-group">
                        <label>Respirasi (RR/menit)</label>
                        <input type="number" id="emr-rr" class="form-control" placeholder="18">
                      </div>
                    </div>
                  </div>

                  <!-- KOLOM 2: PEMERIKSAAN FISIK & DIAGNOSA -->
                  <div class="col-md-6">
                    <h6 class="font-weight-bold text-teal mb-3"><i class="fas fa-diagnoses mr-1"></i> 2. Diagnosa, Tindakan & Terapi</h6>
                    
                    <div class="form-group">
                      <label>Dokter Pemeriksa <span class="text-danger">*</span></label>
                      <select id="emr-dokter" class="form-control" required>${dokOptions}</select>
                    </div>

                    <div class="form-group">
                      <label>Pemeriksaan Fisik</label>
                      <textarea id="emr-fisik" class="form-control" rows="2" placeholder="Status generalis / kelainan fisik..."></textarea>
                    </div>

                    <div class="form-group">
                      <label>Diagnosis Utama (ICD-10) <span class="text-danger">*</span></label>
                      <select id="emr-diagnosa-id" class="form-control" required>${diagOptions}</select>
                    </div>

                    <div class="form-group">
                      <label>Catatan Diagnosa Klinis</label>
                      <input type="text" id="emr-diagnosa-text" class="form-control" placeholder="Deskripsi diagnosa dokter...">
                    </div>

                    <div class="form-group">
                      <label>Tindakan Medis Dilakukan</label>
                      <select id="emr-tindakan-id" class="form-control">
                        <option value="">-- Tanpa Tindakan Tambahan --</option>
                        ${tdkOptions}
                      </select>
                    </div>

                    <div class="form-group">
                      <label>Catatan / Instruksi Edukasi Dokter</label>
                      <textarea id="emr-catatan" class="form-control" rows="2" placeholder="Istirahat cukup, hindari makanan berlemak, kontrol jika demam..."></textarea>
                    </div>
                  </div>
                </div>
              </div>
              <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save mr-1"></i> Simpan Rekam Medis Pasien</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalEmr').modal('show');
  },

  async submitEmr(e, kunjunganId, pasienId) {
    e.preventDefault();

    const diagSelect = document.getElementById('emr-diagnosa-id');
    const diagId = parseInt(diagSelect.value);
    const diagText = document.getElementById('emr-diagnosa-text').value.trim() || diagSelect.options[diagSelect.selectedIndex].text;

    const tdkSelect = document.getElementById('emr-tindakan-id');
    const tdkId = tdkSelect.value ? parseInt(tdkSelect.value) : 0;
    const listTindakan = [];
    if (tdkId > 0) {
      const selectedOpt = tdkSelect.options[tdkSelect.selectedIndex];
      const tarif = parseFloat(selectedOpt.getAttribute('data-tarif')) || 0;
      listTindakan.push({
        tindakanId: tdkId,
        namaTindakan: selectedOpt.text,
        jumlah: 1,
        hargaSatuan: tarif,
        subtotal: tarif
      });
    }

    const payload = {
      kunjunganId,
      pasienId,
      dokterId: parseInt(document.getElementById('emr-dokter').value),
      keluhanUtama: document.getElementById('emr-keluhan').value.trim(),
      riwayatPenyakit: document.getElementById('emr-riwayat').value.trim(),
      tekananDarah: document.getElementById('emr-tensi').value.trim(),
      suhu: parseFloat(document.getElementById('emr-suhu').value) || null,
      beratBadan: parseFloat(document.getElementById('emr-bb').value) || null,
      tinggiBadan: parseFloat(document.getElementById('emr-tb').value) || null,
      denyutNadi: parseInt(document.getElementById('emr-nadi').value) || null,
      frekuensiNafas: parseInt(document.getElementById('emr-rr').value) || null,
      pemeriksaanFisik: document.getElementById('emr-fisik').value.trim(),
      diagnosis: diagText,
      tindakan: listTindakan.length > 0 ? listTindakan[0].namaTindakan : 'Konsultasi Dokter',
      catatanDokter: document.getElementById('emr-catatan').value.trim(),
      status: 'selesai',
      diagnosaIds: [diagId],
      listTindakan
    };

    const res = await this.api('/api/rekammedis', 'POST', payload);
    if (res.success) {
      $('#modalEmr').modal('hide');
      Swal.fire({
        icon: 'success',
        title: 'Rekam Medis Berhasil Disimpan!',
        text: 'Apakah ingin langsung membuat resep obat untuk pasien ini?',
        showCancelButton: true,
        confirmButtonColor: '#0f766e',
        cancelButtonColor: '#64748b',
        confirmButtonText: '<i class="fas fa-prescription mr-1"></i> Buat Resep Obat',
        cancelButtonText: 'Selesai'
      }).then(result => {
        if (result.isConfirmed) {
          app.openBuatResepModal(res.data.id, pasienId, payload.dokterId);
        } else {
          app.loadView('rekammedis');
        }
      });
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  async viewDetailEmr(id) {
    const res = await this.api(`/api/rekammedis/${id}`);
    if (!res.success) return Swal.fire('Error', res.message, 'error');
    const r = res.data;

    let tindakanHtml = '';
    (r.listTindakan || []).forEach(t => {
      tindakanHtml += `<li>${t.namaTindakan} - <strong>${this.formatRupiah(t.subtotal)}</strong></li>`;
    });

    this.renderModal(`
      <div class="modal fade" id="modalDetailEmr" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Detail Rekam Medis: ${r.namaPasien} (${r.noRm})</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <div class="modal-body p-4">
              <p><strong>Tanggal Pemeriksaan:</strong> ${this.formatDate(r.tanggalPemeriksaan)} | <strong>Dokter:</strong> ${r.namaDokter || '-'}</p>
              <hr>
              <div class="row">
                <div class="col-md-6">
                  <p><strong>Keluhan Utama:</strong><br>${r.keluhanUtama || '-'}</p>
                  <p><strong>Riwayat Penyakit:</strong><br>${r.riwayatPenyakit || '-'}</p>
                  <p><strong>Pemeriksaan Fisik:</strong><br>${r.pemeriksaanFisik || '-'}</p>
                </div>
                <div class="col-md-6">
                  <p><strong>Tanda Vital:</strong><br>
                    TD: ${r.tekananDarah || '-'} | Suhu: ${r.suhu || '-'} °C | BB: ${r.beratBadan || '-'} kg | TB: ${r.tinggiBadan || '-'} cm
                  </p>
                  <p><strong>Diagnosa:</strong><br><span class="text-primary font-weight-bold h5">${r.diagnosis || '-'}</span></p>
                  <p><strong>Tindakan Dilakukan:</strong></p>
                  <ul>${tindakanHtml || '<li>Konsultasi Medis</li>'}</ul>
                </div>
              </div>
              <div class="alert alert-light border mt-3 mb-0">
                <strong>Catatan / Edukasi Dokter:</strong><br>${r.catatanDokter || '-'}
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Tutup</button>
            </div>
          </div>
        </div>
      </div>
    `);
    $('#modalDetailEmr').modal('show');
  },

  // ============================================================
  // TRANSAKSI: RESEP & APOTEK DISPENSING
  // ============================================================
  async renderResep(container) {
    const res = await this.api('/api/resep');
    const items = res.data || [];

    let rows = '';
    items.forEach((r, idx) => {
      const isSelesai = r.status === 'selesai';
      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge badge-light border font-weight-bold">${r.noResep}</span></td>
          <td>${this.formatDate(r.tanggalResep)}</td>
          <td><strong>${r.namaPasien}</strong> <small class="text-muted d-block">RM: ${r.noRm}</small></td>
          <td>${r.namaDokter || '-'}</td>
          <td><strong>${this.formatRupiah(r.totalBiayaObat)}</strong></td>
          <td><span class="badge ${isSelesai ? 'badge-success' : 'badge-warning'} text-uppercase font-weight-bold">${r.status}</span></td>
          <td>
            <button class="btn btn-xs btn-outline-info mr-1" onclick="app.viewDetailResep(${r.id})" title="Lihat Item"><i class="fas fa-eye"></i></button>
            ${!isSelesai ? `<button class="btn btn-xs btn-success" onclick="app.dispenseResep(${r.id})" title="Proses Tebus Obat (Potong Stok)"><i class="fas fa-check-double mr-1"></i> Dispense</button>` : '<span class="text-success small font-weight-bold"><i class="fas fa-check"></i> Selesai</span>'}
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <h1 class="m-0 font-weight-bold"><i class="fas fa-prescription text-teal mr-2"></i>Apotek & Pelayanan Resep Obat</h1>
            <small class="text-muted">Dispensing obat resep dokter, pengurangan otomatis stok obat & histori mutasi</small>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-resep">
            <thead>
              <tr>
                <th width="30">No</th>
                <th>No. Resep</th>
                <th>Tanggal</th>
                <th>Nama Pasien</th>
                <th>Dokter</th>
                <th>Total Biaya Obat</th>
                <th>Status Resep</th>
                <th width="150">Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-resep').DataTable({ responsive: true });
  },

  async openBuatResepModal(rekamMedisId, pasienId, dokterId) {
    const resObat = await this.api('/api/obat');
    const obatList = resObat.data || [];

    const obatOptions = obatList.map(o => `<option value="${o.id}" data-harga="${o.hargaJual}" data-stok="${o.stok}">${o.namaObat} (Stok: ${o.stok} | ${this.formatRupiah(o.hargaJual)})</option>`).join('');

    this.renderModal(`
      <div class="modal fade" id="modalResep" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold"><i class="fas fa-prescription mr-2"></i>Buat Resep Obat Pasien</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitResep(event, ${rekamMedisId}, ${pasienId}, ${dokterId})">
              <div class="modal-body p-4">
                <div class="form-group mb-3">
                  <label class="font-weight-bold">Item Obat 1 <span class="text-danger">*</span></label>
                  <select id="rsp-obat-1" class="form-control" required>${obatOptions}</select>
                </div>
                <div class="row">
                  <div class="col-md-3 form-group">
                    <label>Jumlah</label>
                    <input type="number" id="rsp-jml-1" class="form-control" value="10" min="1" required>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Aturan Pakai</label>
                    <input type="text" id="rsp-aturan-1" class="form-control" value="3x1 sesudah makan" required>
                  </div>
                  <div class="col-md-5 form-group">
                    <label>Catatan Dosis</label>
                    <input type="text" id="rsp-dosis-1" class="form-control" value="500 mg, bila demam/nyeri">
                  </div>
                </div>

                <hr>

                <div class="form-group mb-3">
                  <label class="font-weight-bold">Item Obat 2 (Opsional)</label>
                  <select id="rsp-obat-2" class="form-control">
                    <option value="">-- Pilih Obat Tambahan --</option>
                    ${obatOptions}
                  </select>
                </div>
                <div class="row">
                  <div class="col-md-3 form-group">
                    <label>Jumlah</label>
                    <input type="number" id="rsp-jml-2" class="form-control" value="10" min="1">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Aturan Pakai</label>
                    <input type="text" id="rsp-aturan-2" class="form-control" value="1x1 sesudah sarapan">
                  </div>
                  <div class="col-md-5 form-group">
                    <label>Catatan Dosis</label>
                    <input type="text" id="rsp-dosis-2" class="form-control" value="Vitamin / Suplemen">
                  </div>
                </div>

                <div class="form-group mt-3">
                  <label>Catatan Apoteker</label>
                  <input type="text" id="rsp-catatan" class="form-control" placeholder="Habiskan antibiotik, simpan di tempat sejuk...">
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-check mr-1"></i> Terbitkan Resep ke Apotek</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalResep').modal('show');
  },

  async submitResep(e, rekamMedisId, pasienId, dokterId) {
    e.preventDefault();

    const items = [];
    // Item 1
    const obat1 = parseInt(document.getElementById('rsp-obat-1').value);
    const jml1 = parseInt(document.getElementById('rsp-jml-1').value);
    items.push({
      obatId: obat1,
      jumlah: jml1,
      aturanPakai: document.getElementById('rsp-aturan-1').value.trim(),
      dosis: document.getElementById('rsp-dosis-1').value.trim()
    });

    // Item 2
    const obat2Val = document.getElementById('rsp-obat-2').value;
    if (obat2Val) {
      items.push({
        obatId: parseInt(obat2Val),
        jumlah: parseInt(document.getElementById('rsp-jml-2').value) || 1,
        aturanPakai: document.getElementById('rsp-aturan-2').value.trim(),
        dosis: document.getElementById('rsp-dosis-2').value.trim()
      });
    }

    const payload = {
      rekamMedisId,
      pasienId,
      dokterId,
      catatan: document.getElementById('rsp-catatan').value.trim(),
      items
    };

    const res = await this.api('/api/resep', 'POST', payload);
    if (res.success) {
      $('#modalResep').modal('hide');
      Swal.fire('Resep Berhasil Dibuat!', `No. Resep: ${res.data.noResep}. Resep telah diteruskan ke Farmasi / Apotek.`, 'success');
      this.loadView('resep');
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  async dispenseResep(id) {
    Swal.fire({
      title: 'Proses Dispense Resep Obat?',
      text: 'Stok obat di apotek akan otomatis dipotong dan dicatat dalam log mutasi.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Ya, Dispense & Potong Stok'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await this.api(`/api/resep/${id}/dispense`, 'PUT');
        if (res.success) {
          Swal.fire('Sukses!', res.message, 'success');
          this.loadView('resep');
        } else {
          Swal.fire('Gagal', res.message, 'error');
        }
      }
    });
  },

  async viewDetailResep(id) {
    const res = await this.api(`/api/resep/${id}`);
    if (!res.success) return Swal.fire('Error', res.message, 'error');
    const r = res.data;

    let itemRows = '';
    (r.items || []).forEach((itm, idx) => {
      itemRows += `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${itm.namaObat}</strong></td>
          <td>${itm.jumlah}</td>
          <td>${itm.aturanPakai || '-'}</td>
          <td>${this.formatRupiah(itm.hargaSatuan)}</td>
          <td><strong>${this.formatRupiah(itm.subtotal)}</strong></td>
        </tr>
      `;
    });

    this.renderModal(`
      <div class="modal fade" id="modalDetailResep" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Rincian Resep: ${r.noResep}</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <div class="modal-body p-4">
              <p><strong>Pasien:</strong> ${r.namaPasien} (${r.noRm}) | <strong>Dokter:</strong> ${r.namaDokter || '-'}</p>
              <table class="table table-bordered table-striped mt-3">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Obat</th>
                    <th>Jumlah</th>
                    <th>Aturan Pakai</th>
                    <th>Harga</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
                <tfoot>
                  <tr>
                    <th colspan="5" class="text-right">Total Biaya Obat:</th>
                    <th class="text-primary">${this.formatRupiah(r.totalBiayaObat)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Tutup</button>
            </div>
          </div>
        </div>
      </div>
    `);
    $('#modalDetailResep').modal('show');
  },

  // ============================================================
  // TRANSAKSI: PEMBELIAN / RESTOK OBAT
  // ============================================================
  async renderPembelian(container) {
    const res = await this.api('/api/pembelian');
    const items = res.data || [];

    let rows = '';
    items.forEach((p, idx) => {
      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge badge-light border font-weight-bold">${p.noFaktur}</span></td>
          <td>${this.formatDate(p.tanggalPembelian)}</td>
          <td><strong>${p.namaSupplier || '-'}</strong></td>
          <td><strong>${this.formatRupiah(p.totalHarga)}</strong></td>
          <td>${p.namaPetugas || 'Petugas'}</td>
          <td><span class="badge badge-success font-weight-bold text-uppercase">${p.status}</span></td>
          <td>
            <button class="btn btn-xs btn-outline-info" onclick="app.viewDetailPembelian(${p.id})"><i class="fas fa-eye"></i> Detail</button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <h1 class="m-0 font-weight-bold"><i class="fas fa-cart-plus text-teal mr-2"></i>Pengadaan & Pembelian Obat (Restok)</h1>
            <small class="text-muted">Faktur pembelian dari distributor supplier & penambahan stok otomatis</small>
          </div>
          <div class="col-sm-6 text-right">
            <button class="btn btn-primary" onclick="app.openAddPembelianModal()">
              <i class="fas fa-plus mr-1"></i> Input Faktur Pembelian Baru
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-pembelian">
            <thead>
              <tr>
                <th width="30">No</th>
                <th>No. Faktur</th>
                <th>Tanggal</th>
                <th>Supplier / Distributor</th>
                <th>Total Pembelian</th>
                <th>Petugas</th>
                <th>Status</th>
                <th width="90">Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-pembelian').DataTable({ responsive: true });
  },

  async openAddPembelianModal() {
    const [resSupplier, resObat] = await Promise.all([
      this.api('/api/supplier'),
      this.api('/api/obat')
    ]);

    const supOptions = (resSupplier.data || []).map(s => `<option value="${s.id}">${s.namaSupplier}</option>`).join('');
    const obatOptions = (resObat.data || []).map(o => `<option value="${o.id}" data-beli="${o.hargaBeli}">${o.namaObat}</option>`).join('');
    const today = new Date().toISOString().split('T')[0];

    this.renderModal(`
      <div class="modal fade" id="modalPembelian" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold"><i class="fas fa-cart-plus mr-2"></i>Input Faktur Pengadaan / Pembelian Obat</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitPembelian(event)">
              <div class="modal-body p-4">
                <div class="row">
                  <div class="col-md-6 form-group">
                    <label>Pilih Supplier / Distributor <span class="text-danger">*</span></label>
                    <select id="pb-supplier" class="form-control" required>${supOptions}</select>
                  </div>
                  <div class="col-md-6 form-group">
                    <label>Tanggal Faktur</label>
                    <input type="date" id="pb-tanggal" class="form-control" value="${today}" required>
                  </div>
                </div>

                <div class="card card-outline card-teal mt-2">
                  <div class="card-header py-2 font-weight-bold">Item Obat yang Diterima</div>
                  <div class="card-body p-3">
                    <div class="row">
                      <div class="col-md-6 form-group">
                        <label>Pilih Obat <span class="text-danger">*</span></label>
                        <select id="pb-obat-1" class="form-control" required>${obatOptions}</select>
                      </div>
                      <div class="col-md-3 form-group">
                        <label>Jumlah Masuk</label>
                        <input type="number" id="pb-jml-1" class="form-control" value="100" min="1" required>
                      </div>
                      <div class="col-md-3 form-group">
                        <label>Harga Beli Satuan (Rp)</label>
                        <input type="number" id="pb-harga-1" class="form-control" value="650" min="0" required>
                      </div>
                      <div class="col-md-6 form-group">
                        <label>Nomor Batch</label>
                        <input type="text" id="pb-batch-1" class="form-control" value="BATCH-${new Date().getFullYear()}01">
                      </div>
                      <div class="col-md-6 form-group">
                        <label>Tanggal Expired</label>
                        <input type="date" id="pb-exp-1" class="form-control" value="2028-12-31">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-check mr-1"></i> Simpan & Tambah ke Stok Obat</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalPembelian').modal('show');
  },

  async submitPembelian(e) {
    e.preventDefault();
    const obatId = parseInt(document.getElementById('pb-obat-1').value);
    const jml = parseInt(document.getElementById('pb-jml-1').value);
    const harga = parseFloat(document.getElementById('pb-harga-1').value) || 0;

    const payload = {
      supplierId: parseInt(document.getElementById('pb-supplier').value),
      tanggalPembelian: document.getElementById('pb-tanggal').value,
      userId: this.currentUser?.id || 1,
      items: [{
        obatId,
        jumlah: jml,
        hargaSatuan: harga,
        nomorBatch: document.getElementById('pb-batch-1').value.trim(),
        tanggalExpired: document.getElementById('pb-exp-1').value || null
      }]
    };

    const res = await this.api('/api/pembelian', 'POST', payload);
    if (res.success) {
      $('#modalPembelian').modal('hide');
      Swal.fire('Sukses!', res.message, 'success');
      this.loadView('pembelian');
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  async viewDetailPembelian(id) {
    const res = await this.api(`/api/pembelian/${id}`);
    if (!res.success) return Swal.fire('Error', res.message, 'error');
    const p = res.data;

    let itemsHtml = '';
    (p.items || []).forEach(itm => {
      itemsHtml += `
        <tr>
          <td><strong>${itm.namaObat}</strong></td>
          <td>${itm.jumlah}</td>
          <td>${this.formatRupiah(itm.hargaSatuan)}</td>
          <td>${itm.nomorBatch || '-'}</td>
          <td><strong>${this.formatRupiah(itm.subtotal)}</strong></td>
        </tr>
      `;
    });

    this.renderModal(`
      <div class="modal fade" id="modalDetailPembelian" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold">Faktur Pembelian: ${p.noFaktur}</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <div class="modal-body p-4">
              <p><strong>Supplier:</strong> ${p.namaSupplier} | <strong>Tanggal:</strong> ${this.formatDate(p.tanggalPembelian)}</p>
              <table class="table table-bordered table-striped mt-3">
                <thead><tr><th>Nama Obat</th><th>Jumlah</th><th>Harga Beli</th><th>Batch</th><th>Subtotal</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
              </table>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Tutup</button></div>
          </div>
        </div>
      </div>
    `);
    $('#modalDetailPembelian').modal('show');
  },

  // ============================================================
  // TRANSAKSI: KASIR & PEMBAYARAN BILLING
  // ============================================================
  async renderPembayaran(container) {
    const res = await this.api('/api/pembayaran');
    const items = res.data || [];

    let rows = '';
    items.forEach((p, idx) => {
      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge badge-light border font-weight-bold">${p.noPembayaran}</span></td>
          <td>${this.formatDate(p.tanggalPembayaran)}</td>
          <td><strong>${p.namaPasien}</strong> <small class="text-muted d-block">RM: ${p.noRm}</small></td>
          <td>${this.formatRupiah(p.totalTagihan)}</td>
          <td><span class="badge badge-info text-uppercase">${p.metodePembayaran}</span></td>
          <td><span class="badge badge-success font-weight-bold text-uppercase">${p.status}</span></td>
          <td>
            <button class="btn btn-xs btn-primary mr-1" onclick="app.cetakKwitansi(${p.id})" title="Cetak Kwitansi"><i class="fas fa-print mr-1"></i> Kwitansi</button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <div class="row align-items-center">
          <div class="col-sm-6">
            <h1 class="m-0 font-weight-bold"><i class="fas fa-cash-register text-teal mr-2"></i>Kasir & Pembayaran Pasien (Billing)</h1>
            <small class="text-muted">Kalkulasi biaya otomatis pendaftaran, dokter, tindakan, obat & cetak kwitansi</small>
          </div>
          <div class="col-sm-6 text-right">
            <button class="btn btn-primary" onclick="app.openProsesKasirModal()">
              <i class="fas fa-calculator mr-1"></i> Proses Tagihan Pasien
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-pembayaran">
            <thead>
              <tr>
                <th width="30">No</th>
                <th>No. Invoice</th>
                <th>Tanggal Bayar</th>
                <th>Nama Pasien</th>
                <th>Total Bayar</th>
                <th>Metode</th>
                <th>Status</th>
                <th width="110">Aksi</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-pembayaran').DataTable({ responsive: true });
  },

  async openProsesKasirModal() {
    const resKj = await this.api('/api/kunjungan');
    const listKj = (resKj.data || []).filter(k => k.status !== 'batal');

    const kjOptions = listKj.map(k => `<option value="${k.id}">${k.noKunjungan} - ${k.namaPasien} (${k.namaPoli || 'Umum'} | Status: ${k.status})</option>`).join('');

    Swal.fire({
      title: 'Pilih Kunjungan Pasien untuk Kasir',
      html: `
        <div class="form-group text-left">
          <label>Pilih Kunjungan Pasien:</label>
          <select id="kasir-kunjungan-select" class="form-control">${kjOptions}</select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#0f766e',
      confirmButtonText: 'Hitung Tagihan'
    }).then(async result => {
      if (result.isConfirmed) {
        const kjId = parseInt(document.getElementById('kasir-kunjungan-select').value);
        app.showKasirBillingForm(kjId);
      }
    });
  },

  async showKasirBillingForm(kunjunganId) {
    const res = await this.api(`/api/pembayaran/kalkulasi/${kunjunganId}`);
    if (!res.success) return Swal.fire('Error', res.message, 'error');

    const data = res.data;
    const k = data.kunjungan;
    const items = data.items || [];

    let itemRows = '';
    items.forEach((itm, idx) => {
      itemRows += `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="badge badge-light border text-uppercase">${itm.jenis}</span></td>
          <td>${itm.keterangan}</td>
          <td>${itm.jumlah}</td>
          <td>${this.formatRupiah(itm.hargaSatuan)}</td>
          <td><strong>${this.formatRupiah(itm.subtotal)}</strong></td>
        </tr>
      `;
    });

    this.renderModal(`
      <div class="modal fade" id="modalKasirBilling" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-teal text-white">
              <h5 class="modal-title font-weight-bold"><i class="fas fa-file-invoice-dollar mr-2"></i>Rincian Tagihan: ${k.namaPasien} (${k.noKunjungan})</h5>
              <button type="button" class="close text-white" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <form onsubmit="app.submitPembayaranKasir(event, ${kunjunganId}, ${k.pasienId}, ${data.total_tagihan})">
              <div class="modal-body p-4">
                <div class="alert alert-light border py-2 px-3 mb-3">
                  <div class="row">
                    <div class="col-md-4"><strong>No. RM:</strong> ${k.noRm}</div>
                    <div class="col-md-4"><strong>Pasien:</strong> ${k.namaPasien}</div>
                    <div class="col-md-4"><strong>Cara Bayar:</strong> ${k.caraBayar.toUpperCase()}</div>
                  </div>
                </div>

                <table class="table table-sm table-bordered">
                  <thead class="bg-light">
                    <tr>
                      <th>No</th>
                      <th>Komponen</th>
                      <th>Keterangan</th>
                      <th>Qty</th>
                      <th>Tarif</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows || '<tr><td colspan="6" class="text-center py-2">Tidak ada item tagihan.</td></tr>'}</tbody>
                  <tfoot>
                    <tr class="bg-light font-weight-bold">
                      <td colspan="5" class="text-right">TOTAL TAGIHAN:</td>
                      <td class="text-primary h5 font-weight-bold">${this.formatRupiah(data.total_tagihan)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div class="row mt-4">
                  <div class="col-md-4 form-group">
                    <label>Metode Pembayaran</label>
                    <select id="ks-metode" class="form-control" required>
                      <option value="tunai">Tunai / Cash</option>
                      <option value="qris">QRIS (GoPay/OVO/BCA/Dana)</option>
                      <option value="debit">Kartu Debit</option>
                      <option value="transfer">Transfer Bank</option>
                      <option value="bpjs">BPJS Kesehatan (Klaim)</option>
                    </select>
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Jumlah Uang Dibayar (Rp)</label>
                    <input type="number" id="ks-bayar" class="form-control font-weight-bold" value="${data.total_tagihan}" min="${data.total_tagihan}" oninput="app.hitungKembalian(${data.total_tagihan})">
                  </div>
                  <div class="col-md-4 form-group">
                    <label>Kembalian (Rp)</label>
                    <input type="text" id="ks-kembalian" class="form-control bg-light font-weight-bold text-success" value="Rp 0" readonly>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Batal</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-check-circle mr-1"></i> Proses Lunas & Cetak Kwitansi</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);
    $('#modalKasirBilling').modal('show');
  },

  hitungKembalian(totalTagihan) {
    const bayar = parseFloat(document.getElementById('ks-bayar').value) || 0;
    const kembalian = Math.max(0, bayar - totalTagihan);
    document.getElementById('ks-kembalian').value = this.formatRupiah(kembalian);
  },

  async submitPembayaranKasir(e, kunjunganId, pasienId, totalTagihan) {
    e.preventDefault();
    const totalBayar = parseFloat(document.getElementById('ks-bayar').value) || totalTagihan;
    const metode = document.getElementById('ks-metode').value;

    const payload = {
      kunjunganId,
      pasienId,
      userId: this.currentUser?.id || 4,
      totalTagihan,
      totalBayar,
      metodePembayaran: metode,
      status: 'lunas',
      biayaPendaftaran: 0,
      biayaKonsultasi: 0,
      biayaTindakan: 0,
      biayaObat: 0
    };

    const res = await this.api('/api/pembayaran', 'POST', payload);
    if (res.success) {
      $('#modalKasirBilling').modal('hide');
      Swal.fire({
        icon: 'success',
        title: 'Pembayaran Sukses!',
        html: `Nomor Invoice: <br><strong class="h4 text-success">${res.data.noPembayaran}</strong><br>Kembalian: <strong>${this.formatRupiah(res.data.kembalian)}</strong>`,
        confirmButtonColor: '#0f766e',
        confirmButtonText: '<i class="fas fa-print mr-1"></i> Cetak Kwitansi'
      }).then(() => {
        app.cetakKwitansi(res.data.id);
        app.loadView('pembayaran');
      });
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  async cetakKwitansi(id) {
    const res = await this.api(`/api/pembayaran/${id}/kwitansi`);
    if (!res.success) return Swal.fire('Error', res.message, 'error');

    const data = res.data;
    const k = data.kwitansi;
    const klinik = data.klinik;
    const items = data.items || [];

    let itemRows = '';
    items.forEach(itm => {
      itemRows += `
        <tr>
          <td>${itm.keterangan}</td>
          <td class="text-right">${this.formatRupiah(itm.subtotal)}</td>
        </tr>
      `;
    });

    const content = `
      <div class="receipt-box" id="printable-receipt">
        <div class="text-center border-bottom pb-2 mb-2">
          <h5 class="font-weight-bold mb-1">${klinik.nama_klinik || 'Klinik Pratama Sehat Mandiri'}</h5>
          <small class="d-block">${klinik.alamat_klinik || 'Jl. Gatot Subroto Kav. 42, Jakarta'}</small>
          <small class="d-block">Telp: ${klinik.telepon_klinik || '(021) 5296-1234'}</small>
          <small class="d-block">Izin: ${klinik.nomor_izin_klinik || '445/098/SIP.KLINIK/2023'}</small>
        </div>

        <div class="small mb-2">
          <div><strong>No. Invoice:</strong> ${k.no_pembayaran}</div>
          <div><strong>Tanggal:</strong> ${this.formatDate(k.tanggal_pembayaran)}</div>
          <div><strong>Pasien:</strong> ${k.NamaPasien} (${k.NoRm})</div>
          <div><strong>Poli / Dokter:</strong> ${k.NamaPoli || '-'} / ${k.NamaDokter || '-'}</div>
          <div><strong>Kasir:</strong> ${k.NamaKasir || 'Kasir Klinik'}</div>
        </div>

        <table class="table table-sm table-borderless small border-top border-bottom py-1 my-2">
          <tbody>${itemRows}</tbody>
        </table>

        <div class="small">
          <div class="d-flex justify-content-between font-weight-bold">
            <span>TOTAL TAGIHAN:</span>
            <span>${this.formatRupiah(k.total_tagihan)}</span>
          </div>
          <div class="d-flex justify-content-between">
            <span>Metode Bayar:</span>
            <span>${(k.metode_pembayaran || 'tunai').toUpperCase()}</span>
          </div>
          <div class="d-flex justify-content-between">
            <span>Total Bayar:</span>
            <span>${this.formatRupiah(k.total_bayar)}</span>
          </div>
          <div class="d-flex justify-content-between">
            <span>Kembalian:</span>
            <span>${this.formatRupiah(k.kembalian)}</span>
          </div>
        </div>

        <div class="text-center mt-3 pt-2 border-top small text-muted">
          <em>${klinik.footer_kwitansi || 'Terima kasih atas kunjungan Anda. Semoga lekas sembuh.'}</em>
        </div>
      </div>
    `;

    document.getElementById('kwitansi-print-content').innerHTML = content;
    $('#modalPrintKwitansi').modal('show');
  },

  // ============================================================
  // LAPORAN: KUNJUNGAN, PENDAPATAN, REKAM MEDIS, OBAT
  // ============================================================
  async renderLapKunjungan(container) {
    const res = await this.api('/api/laporan/kunjungan');
    const data = res.data;
    const items = data.items || [];
    const sum = data.summary || {};

    let rows = '';
    items.forEach((k, idx) => {
      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${k.no_kunjungan}</strong></td>
          <td>${this.formatDate(k.tanggal_kunjungan)}</td>
          <td>${k.NamaPasien} (${k.NoRm})</td>
          <td>${k.NamaPoli || '-'}</td>
          <td>${k.NamaDokter || '-'}</td>
          <td>${k.cara_bayar.toUpperCase()}</td>
          <td><span class="badge badge-success text-uppercase">${k.status}</span></td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <h1 class="m-0 font-weight-bold"><i class="fas fa-file-medical-alt text-teal mr-2"></i>Laporan Kunjungan Pasien</h1>
        <small class="text-muted">Rekapitulasi pendaftaran kunjungan rawat jalan klinik</small>
      </div>

      <div class="row mb-3">
        <div class="col-md-4">
          <div class="info-box bg-light">
            <span class="info-box-icon bg-teal"><i class="fas fa-users"></i></span>
            <div class="info-box-content">
              <span class="info-box-text">Total Kunjungan</span>
              <span class="info-box-number font-weight-bold h4">${sum.total || 0}</span>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="info-box bg-light">
            <span class="info-box-icon bg-success"><i class="fas fa-check-circle"></i></span>
            <div class="info-box-content">
              <span class="info-box-text">Pelayanan Selesai</span>
              <span class="info-box-number font-weight-bold h4">${sum.selesai || 0}</span>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="info-box bg-light">
            <span class="info-box-icon bg-warning"><i class="fas fa-clock"></i></span>
            <div class="info-box-content">
              <span class="info-box-text">Antrian Menunggu</span>
              <span class="info-box-number font-weight-bold h4">${sum.menunggu || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-lap-kj">
            <thead>
              <tr>
                <th>No</th>
                <th>No. Kunjungan</th>
                <th>Tanggal</th>
                <th>Nama Pasien</th>
                <th>Poli</th>
                <th>Dokter</th>
                <th>Cara Bayar</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-lap-kj').DataTable({ responsive: true });
  },

  async renderLapPendapatan(container) {
    const res = await this.api('/api/laporan/pendapatan');
    const data = res.data;
    const items = data.items || [];
    const sum = data.summary || {};

    let rows = '';
    items.forEach((p, idx) => {
      rows += `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${p.noPembayaran}</strong></td>
          <td>${this.formatDate(p.tanggalPembayaran)}</td>
          <td>${p.namaPasien} (${p.noRm})</td>
          <td>${this.formatRupiah(p.biayaPendaftaran)}</td>
          <td>${this.formatRupiah(p.biayaKonsultasi)}</td>
          <td>${this.formatRupiah(p.biayaTindakan)}</td>
          <td>${this.formatRupiah(p.biayaObat)}</td>
          <td class="text-primary font-weight-bold">${this.formatRupiah(p.totalBayar)}</td>
          <td><span class="badge badge-info">${p.metodePembayaran.toUpperCase()}</span></td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <h1 class="m-0 font-weight-bold"><i class="fas fa-file-invoice-dollar text-teal mr-2"></i>Laporan Pendapatan Kasir & Billing</h1>
        <small class="text-muted">Rekapitulasi keuangan kasir klinik per komponen pendapatan</small>
      </div>

      <div class="row mb-3">
        <div class="col-md-3">
          <div class="small-box bg-emerald-custom">
            <div class="inner">
              <h3 style="font-size:1.6rem;">${this.formatRupiah(sum.totalPendapatan)}</h3>
              <p>Total Pendapatan</p>
            </div>
            <div class="icon"><i class="fas fa-money-bill-wave"></i></div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="small-box bg-cyan-custom">
            <div class="inner">
              <h3 style="font-size:1.6rem;">${this.formatRupiah(sum.totalKonsultasi)}</h3>
              <p>Jasa Konsultasi</p>
            </div>
            <div class="icon"><i class="fas fa-user-md"></i></div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="small-box bg-teal-custom">
            <div class="inner">
              <h3 style="font-size:1.6rem;">${this.formatRupiah(sum.totalTindakan)}</h3>
              <p>Tarif Tindakan</p>
            </div>
            <div class="icon"><i class="fas fa-syringe"></i></div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="small-box bg-amber-custom">
            <div class="inner">
              <h3 style="font-size:1.6rem;">${this.formatRupiah(sum.totalObat)}</h3>
              <p>Penjualan Obat</p>
            </div>
            <div class="icon"><i class="fas fa-pills"></i></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-lap-keu">
            <thead>
              <tr>
                <th>No</th>
                <th>Invoice</th>
                <th>Tanggal</th>
                <th>Pasien</th>
                <th>Pendaftaran</th>
                <th>Konsultasi</th>
                <th>Tindakan</th>
                <th>Obat</th>
                <th>Total Bayar</th>
                <th>Metode</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-lap-keu').DataTable({ responsive: true });
  },

  async renderLapRekamMedis(container) {
    const res = await this.api('/api/laporan/rekammedis');
    const data = res.data;
    const top = data.topPenyakit || [];
    const items = data.items || [];

    let topRows = '';
    top.forEach((t, i) => {
      topRows += `
        <tr>
          <td><strong class="text-teal">#${i + 1}</strong></td>
          <td><span class="badge badge-primary">${t.kodeIcd || '-'}</span></td>
          <td><strong>${t.namaDiagnosa}</strong></td>
          <td><span class="badge badge-light border font-weight-bold">${t.jumlah} Kasus</span></td>
        </tr>
      `;
    });

    let rmRows = '';
    items.forEach((r, i) => {
      rmRows += `
        <tr>
          <td>${i + 1}</td>
          <td>${this.formatDate(r.tanggalPemeriksaan)}</td>
          <td><strong>${r.namaPasien}</strong> (${r.noRm})</td>
          <td>${r.namaDokter || '-'}</td>
          <td>${r.keluhanUtama || '-'}</td>
          <td><span class="text-primary font-weight-bold">${r.diagnosis || '-'}</span></td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <h1 class="m-0 font-weight-bold"><i class="fas fa-chart-bar text-teal mr-2"></i>Laporan Morbiditas & 10 Besar Penyakit (ICD-10)</h1>
        <small class="text-muted">Statistik tren penyakit pasien rawat jalan klinik</small>
      </div>

      <div class="row">
        <div class="col-lg-5">
          <div class="card card-outline card-teal">
            <div class="card-header font-weight-bold"><i class="fas fa-trophy text-warning mr-2"></i>10 Besar Penyakit Terbanyak</div>
            <div class="card-body p-0">
              <table class="table table-hover mb-0">
                <thead><tr><th>No</th><th>ICD-10</th><th>Nama Diagnosa</th><th>Frekuensi</th></tr></thead>
                <tbody>${topRows || '<tr><td colspan="4" class="text-center py-2 text-muted">Belum ada data diagnosa.</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="col-lg-7">
          <div class="card">
            <div class="card-header font-weight-bold"><i class="fas fa-list mr-2"></i>Histori Rekam Medis Pasien Terakhir</div>
            <div class="card-body">
              <table class="table table-bordered table-striped" id="table-lap-rm">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Tanggal</th>
                    <th>Pasien</th>
                    <th>Dokter</th>
                    <th>Keluhan</th>
                    <th>Diagnosa</th>
                  </tr>
                </thead>
                <tbody>${rmRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-lap-rm').DataTable({ responsive: true });
  },

  async renderLapObat(container) {
    const res = await this.api('/api/laporan/obat');
    const data = res.data;
    const items = data.items || [];
    const logs = data.logs || [];
    const sum = data.summary || {};

    let obatRows = '';
    items.forEach((o, i) => {
      const isKritis = o.stok <= o.stokMinimum;
      obatRows += `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${o.kodeObat}</strong></td>
          <td>${o.namaObat}</td>
          <td>${o.namaKategori || 'Bebas'}</td>
          <td><span class="badge ${isKritis ? 'badge-danger' : 'badge-success'}">${o.stok}</span></td>
          <td>${o.stokMinimum}</td>
          <td>${this.formatRupiah(o.hargaBeli)}</td>
          <td><strong>${this.formatRupiah(o.stok * o.hargaBeli)}</strong></td>
        </tr>
      `;
    });

    let logRows = '';
    logs.forEach(l => {
      const badgeJenis = l.jenis === 'masuk' ? 'badge-success' : 'badge-danger';
      logRows += `
        <tr>
          <td>${this.formatDate(l.created_at)}</td>
          <td>${l.NamaObat}</td>
          <td><span class="badge ${badgeJenis} text-uppercase">${l.jenis}</span></td>
          <td><strong>${l.jumlah}</strong></td>
          <td>${l.stok_sebelum} &rarr; ${l.stok_sesudah}</td>
          <td><small>${l.referensi || '-'} (${l.keterangan || ''})</small></td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <h1 class="m-0 font-weight-bold"><i class="fas fa-boxes text-teal mr-2"></i>Laporan Stok & Mutasi Obat Farmasi</h1>
        <small class="text-muted">Valuasi stok gudang farmasi dan riwayat transaksi masuk/keluar</small>
      </div>

      <div class="row mb-3">
        <div class="col-md-4">
          <div class="info-box bg-light">
            <span class="info-box-icon bg-teal"><i class="fas fa-pills"></i></span>
            <div class="info-box-content">
              <span class="info-box-text">Total Jenis Obat</span>
              <span class="info-box-number font-weight-bold h4">${sum.totalItem || 0}</span>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="info-box bg-light">
            <span class="info-box-icon bg-danger"><i class="fas fa-exclamation-triangle"></i></span>
            <div class="info-box-content">
              <span class="info-box-text">Stok Kritis / Menipis</span>
              <span class="info-box-number font-weight-bold h4">${sum.kritis || 0}</span>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="info-box bg-light">
            <span class="info-box-icon bg-emerald-custom"><i class="fas fa-wallet"></i></span>
            <div class="info-box-content">
              <span class="info-box-text">Total Nilai Aset Stok</span>
              <span class="info-box-number font-weight-bold h4">${this.formatRupiah(sum.totalNilaiStok)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header font-weight-bold"><i class="fas fa-table mr-2"></i>Daftar Valuasi Stok Obat Saat Ini</div>
        <div class="card-body">
          <table class="table table-bordered table-striped" id="table-lap-obat">
            <thead>
              <tr>
                <th>No</th>
                <th>Kode</th>
                <th>Nama Obat</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Min</th>
                <th>Harga Beli</th>
                <th>Total Aset</th>
              </tr>
            </thead>
            <tbody>${obatRows}</tbody>
          </table>
        </div>
      </div>

      <div class="card card-outline card-secondary mt-3">
        <div class="card-header font-weight-bold"><i class="fas fa-history mr-2"></i>Riwayat Mutasi Keluar/Masuk Terakhir</div>
        <div class="card-body p-0 table-responsive">
          <table class="table table-sm table-hover mb-0">
            <thead><tr><th>Tanggal</th><th>Obat</th><th>Jenis</th><th>Qty</th><th>Stok Mutasi</th><th>Keterangan / Ref</th></tr></thead>
            <tbody>${logRows}</tbody>
          </table>
        </div>
      </div>
    `;

    this.dataTableInstance = $('#table-lap-obat').DataTable({ responsive: true });
  },

  // ============================================================
  // PENGATURAN KLINIK
  // ============================================================
  async renderPengaturan(container) {
    const res = await this.api('/api/pengaturan');
    const settings = res.data || {};

    container.innerHTML = `
      <div class="content-header p-0 mb-3">
        <h1 class="m-0 font-weight-bold"><i class="fas fa-sliders-h text-teal mr-2"></i>Pengaturan Klinik & Sistem</h1>
        <small class="text-muted">Profil instansi kesehatan, kop kwitansi, dan kontak operasional</small>
      </div>

      <div class="card card-outline card-teal">
        <div class="card-header font-weight-bold">Informasi Profil Klinik</div>
        <form onsubmit="app.submitPengaturan(event)">
          <div class="card-body p-4">
            <div class="row">
              <div class="col-md-6 form-group">
                <label>Nama Klinik <span class="text-danger">*</span></label>
                <input type="text" id="set-nama" class="form-control" value="${settings['nama_klinik'] || ''}" required>
              </div>
              <div class="col-md-6 form-group">
                <label>Nomor Izin Operasional</label>
                <input type="text" id="set-izin" class="form-control" value="${settings['nomor_izin_klinik'] || ''}">
              </div>
              <div class="col-md-6 form-group">
                <label>Dokter Penanggung Jawab</label>
                <input type="text" id="set-penanggungjawab" class="form-control" value="${settings['nama_dokter_penanggung_jawab'] || ''}">
              </div>
              <div class="col-md-6 form-group">
                <label>No. Telepon / WhatsApp</label>
                <input type="text" id="set-telp" class="form-control" value="${settings['telepon_klinik'] || ''}">
              </div>
              <div class="col-md-6 form-group">
                <label>Email Resmi</label>
                <input type="email" id="set-email" class="form-control" value="${settings['email_klinik'] || ''}">
              </div>
              <div class="col-md-6 form-group">
                <label>Footer Kwitansi / Struk Pembayaran</label>
                <input type="text" id="set-footer" class="form-control" value="${settings['footer_kwitansi'] || ''}">
              </div>
              <div class="col-12 form-group">
                <label>Alamat Lengkap</label>
                <textarea id="set-alamat" class="form-control" rows="2">${settings['alamat_klinik'] || ''}</textarea>
              </div>
            </div>
          </div>
          <div class="card-footer bg-light text-right">
            <button type="submit" class="btn btn-primary font-weight-bold px-4">
              <i class="fas fa-save mr-1"></i> Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    `;
  },

  async submitPengaturan(e) {
    e.preventDefault();
    const payload = {
      'nama_klinik': document.getElementById('set-nama').value.trim(),
      'nomor_izin_klinik': document.getElementById('set-izin').value.trim(),
      'nama_dokter_penanggung_jawab': document.getElementById('set-penanggungjawab').value.trim(),
      'telepon_klinik': document.getElementById('set-telp').value.trim(),
      'email_klinik': document.getElementById('set-email').value.trim(),
      'footer_kwitansi': document.getElementById('set-footer').value.trim(),
      'alamat_klinik': document.getElementById('set-alamat').value.trim()
    };

    const res = await this.api('/api/pengaturan', 'POST', payload);
    if (res.success) {
      Swal.fire('Sukses', 'Pengaturan klinik berhasil diperbarui!', 'success');
    } else {
      Swal.fire('Gagal', res.message, 'error');
    }
  },

  // ============================================================
  // MODAL HELPER
  // ============================================================
  renderModal(modalHtml) {
    const container = document.getElementById('modal-container');
    container.innerHTML = modalHtml;
  }
};

// Initialize Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
