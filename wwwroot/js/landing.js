// LANDING PAGE INTERACTIVE JAVASCRIPT
document.addEventListener('DOMContentLoaded', function () {
  loadClinicInfo();
  loadLiveAntrian();
  initBookingForm();

  // Refresh live antrian every 30 seconds
  setInterval(loadLiveAntrian, 30000);
});

async function loadClinicInfo() {
  try {
    const res = await fetch('/api/public/info');
    const result = await res.json();
    if (result.success && result.data) {
      const data = result.data;

      // Update Clinic Name and Contacts
      if (data.settings) {
        const nama = data.settings['nama_klinik'] || 'Klinik Pratama Sehat Mandiri';
        const alamat = data.settings['alamat_klinik'] || 'Jl. Gatot Subroto Kav. 42, Jakarta';
        const telp = data.settings['telepon_klinik'] || '(021) 5296-1234';
        const email = data.settings['email_klinik'] || 'layanan@sehatmandiri.co.id';

        document.querySelectorAll('.clinic-name').forEach(el => el.textContent = nama);
        document.querySelectorAll('.clinic-address').forEach(el => el.textContent = alamat);
        document.querySelectorAll('.clinic-phone').forEach(el => el.textContent = telp);
        document.querySelectorAll('.clinic-email').forEach(el => el.textContent = email);
      }

      // Update Quick Stats
      if (data.stats) {
        document.getElementById('stat-pasien')?.setAttribute('data-target', data.stats.totalPasien || 1500);
        document.getElementById('stat-dokter')?.setAttribute('data-target', data.stats.totalDokter || 8);
        document.getElementById('stat-poli')?.setAttribute('data-target', data.stats.totalPoli || 5);
        animateCounters();
      }

      // Render Poli Cards
      if (data.poli && data.poli.length > 0) {
        renderPoli(data.poli);
        populatePoliSelect(data.poli);
      }

      // Render Dokter Cards
      if (data.dokter && data.dokter.length > 0) {
        renderDokter(data.dokter, data.jadwal);
        populateDokterSelect(data.dokter);
      }
    }
  } catch (err) {
    console.error('Gagal memuat info klinik:', err);
  }
}

async function loadLiveAntrian() {
  try {
    const res = await fetch('/api/public/antrian');
    const result = await res.json();
    if (result.success && result.data) {
      const list = result.data;
      const container = document.getElementById('live-antrian-list');
      if (!container) return;

      if (list.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-3">Belum ada antrian aktif hari ini.</div>';
        return;
      }

      let html = '';
      list.forEach(p => {
        const dipanggil = p.sedangDipanggil || p.sedangDiperiksa || 'Belum Dipanggil';
        const badgeColor = dipanggil !== 'Belum Dipanggil' ? 'badge-success' : 'badge-secondary';
        html += `
          <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
              <strong class="d-block text-dark">${p.namaPoli}</strong>
              <small class="text-muted"><i class="fas fa-users mr-1"></i>Sisa Antrian: <span class="font-weight-bold text-primary">${p.sisaAntrian}</span> pasien</small>
            </div>
            <div class="text-right">
              <span class="badge ${badgeColor} px-2 py-1 font-weight-bold" style="font-size:0.9rem;">${dipanggil}</span>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    }
  } catch (err) {
    console.error('Gagal memuat live antrian:', err);
  }
}

function renderPoli(poliList) {
  const container = document.getElementById('poli-list');
  if (!container) return;

  const icons = ['fa-stethoscope', 'fa-tooth', 'fa-baby', 'fa-eye', 'fa-heartbeat', 'fa-syringe'];
  let html = '';

  poliList.forEach((item, idx) => {
    const icon = icons[idx % icons.length];
    const tarif = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.tarifPendaftaran);
    html += `
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="poli-card">
          <div class="poli-icon">
            <i class="fas ${icon}"></i>
          </div>
          <h4>${item.namaPoli}</h4>
          <p>${item.deskripsi || 'Layanan medis spesialis dengan dokter profesional dan peralatan mutakhir.'}</p>
          <div class="poli-price">
            <span>Tarif Registrasi</span>
            <strong>${tarif}</strong>
          </div>
          <button class="btn btn-outline-custom mt-3 w-100 btn-daftar-poli" data-id="${item.id}" data-name="${item.namaPoli}" onclick="openBookingModalWithPoli(${item.id})">
            <i class="fas fa-calendar-check mr-1"></i> Daftar Antrian
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderDokter(dokterList, jadwalList) {
  const container = document.getElementById('dokter-list');
  if (!container) return;

  let html = '';
  dokterList.forEach(doc => {
    // Cari jadwal dokter
    let docJadwal = 'Praktek Sesuai Perjanjian';
    if (jadwalList) {
      const match = jadwalList.filter(j => j.dokterId === doc.id);
      if (match.length > 0) {
        docJadwal = match.map(m => `${m.hari} (${m.jamMulai.substring(0,5)} - ${m.jamSelesai.substring(0,5)})`).join('<br>');
      }
    }

    const tarif = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(doc.tarifKonsultasi);

    html += `
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="doctor-card">
          <div class="doctor-img-wrap">
            <div class="doctor-avatar-circle">
              <i class="fas fa-user-md"></i>
            </div>
          </div>
          <div class="doctor-info">
            <h5>${doc.namaDokter}</h5>
            <div class="spec">${doc.spesialisasi || 'Dokter Umum'}</div>
            <div class="doctor-schedule-badge">
              <i class="fas fa-clock text-primary mr-1"></i> ${docJadwal}
            </div>
            <div class="mt-3 text-muted small">
              Tarif Konsultasi: <strong class="text-dark">${tarif}</strong>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function populatePoliSelect(poliList) {
  const select = document.getElementById('booking-poli');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Poliklinik --</option>' +
    poliList.map(p => `<option value="${p.id}">${p.namaPoli}</option>`).join('');
}

function populateDokterSelect(dokterList) {
  const select = document.getElementById('booking-dokter');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Dokter (Opsional) --</option>' +
    dokterList.map(d => `<option value="${d.id}">${d.namaDokter} (${d.spesialisasi || 'Umum'})</option>`).join('');
}

function openBookingModalWithPoli(poliId) {
  const select = document.getElementById('booking-poli');
  if (select) select.value = poliId;
  $('#modalBookingOnline').modal('show');
}

function initBookingForm() {
  const form = document.getElementById('form-booking-online');
  if (!form) return;

  // Set default date to today
  const tglInput = document.getElementById('booking-tanggal');
  if (tglInput) {
    const today = new Date().toISOString().split('T')[0];
    tglInput.value = today;
    tglInput.min = today;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Memproses Pendaftaran...';

    const payload = {
      namaPasien: document.getElementById('booking-nama').value.trim(),
      nik: document.getElementById('booking-nik').value.trim(),
      jenisKelamin: document.getElementById('booking-jk').value,
      telepon: document.getElementById('booking-telepon').value.trim(),
      alamat: document.getElementById('booking-alamat').value.trim(),
      poliId: parseInt(document.getElementById('booking-poli').value),
      dokterId: document.getElementById('booking-dokter').value ? parseInt(document.getElementById('booking-dokter').value) : null,
      tanggalKunjungan: document.getElementById('booking-tanggal').value,
      caraBayar: document.getElementById('booking-carabayar').value,
      noBpjs: document.getElementById('booking-nobpjs')?.value.trim() || null,
      keluhan: document.getElementById('booking-keluhan').value.trim()
    };

    try {
      const res = await fetch('/api/public/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success && result.data) {
        $('#modalBookingOnline').modal('hide');
        form.reset();

        const data = result.data;
        Swal.fire({
          icon: 'success',
          title: 'Pendaftaran Berhasil!',
          html: `
            <div class="text-left p-3" style="background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
              <p class="mb-1"><strong>Nomor Registrasi:</strong> <span class="badge badge-primary font-weight-bold" style="font-size:1.1rem;">${data.noKunjungan}</span></p>
              <p class="mb-1"><strong>Nomor Antrian:</strong> <span class="badge badge-success font-weight-bold" style="font-size:1.1rem;">Antrian #${data.noAntrianUrut}</span></p>
              <p class="mb-1"><strong>No. Rekam Medis:</strong> ${data.noRm}</p>
              <p class="mb-1"><strong>Nama Pasien:</strong> ${data.namaPasien}</p>
              <p class="mb-1"><strong>Poliklinik:</strong> ${data.namaPoli}</p>
              <p class="mb-0"><strong>Tanggal:</strong> ${data.tanggal}</p>
            </div>
            <p class="text-muted small mt-3">Silakan tunjukkan Nomor Registrasi ini kepada petugas pendaftaran saat tiba di klinik.</p>
          `,
          confirmButtonColor: '#0f766e',
          confirmButtonText: 'Tutup & Simpan Tiket'
        });

        loadLiveAntrian();
      } else {
        Swal.fire('Gagal', result.message || 'Gagal melakukan booking.', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Terjadi kesalahan sistem.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });

  // Toggle No BPJS input
  const caraBayarSelect = document.getElementById('booking-carabayar');
  if (caraBayarSelect) {
    caraBayarSelect.addEventListener('change', function () {
      const bpjsGroup = document.getElementById('group-nobpjs');
      if (bpjsGroup) {
        bpjsGroup.style.display = this.value === 'bpjs' ? 'block' : 'none';
      }
    });
  }
}

function animateCounters() {
  const counters = document.querySelectorAll('.counter-val');
  counters.forEach(counter => {
    const target = +counter.getAttribute('data-target') || 0;
    let count = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const timer = setInterval(() => {
      count += step;
      if (count >= target) {
        counter.innerText = target + '+';
        clearInterval(timer);
      } else {
        counter.innerText = count;
      }
    }, 30);
  });
}
