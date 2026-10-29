$baseUrl = "http://localhost:5194"

Write-Host "--- 1. Testing Auth Login ---" -ForegroundColor Cyan
$loginPayload = @{ username = "admin"; password = "password" } | ConvertTo-Json
$auth = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginPayload -ContentType "application/json"
Write-Host "Login: Success=$($auth.success), User=$($auth.data.nama_lengkap), Role=$($auth.data.role)" -ForegroundColor Green

Write-Host "`n--- 2. Testing Master Endpoints ---" -ForegroundColor Cyan
$master = @("/api/users", "/api/poli", "/api/dokter", "/api/pasien", "/api/tindakan", "/api/obat", "/api/supplier")
foreach ($ep in $master) {
    $res = Invoke-RestMethod -Uri "$baseUrl$ep" -Method Get
    Write-Host "$ep -> Success=$($res.success), Count=$(@($res.data).Count)" -ForegroundColor Green
}

Write-Host "`n--- 3. Testing Transaksi Endpoints ---" -ForegroundColor Cyan
$transaksi = @("/api/kunjungan", "/api/rekammedis", "/api/resep", "/api/pembelian", "/api/pembayaran")
foreach ($ep in $transaksi) {
    $res = Invoke-RestMethod -Uri "$baseUrl$ep" -Method Get
    Write-Host "$ep -> Success=$($res.success), Count=$(@($res.data).Count)" -ForegroundColor Green
}

Write-Host "`n--- 4. Testing Laporan Endpoints ---" -ForegroundColor Cyan
$laporan = @("/api/laporan/kunjungan", "/api/laporan/pendapatan", "/api/laporan/rekammedis", "/api/laporan/obat")
foreach ($ep in $laporan) {
    $res = Invoke-RestMethod -Uri "$baseUrl$ep" -Method Get
    Write-Host "$ep -> Success=$($res.success)" -ForegroundColor Green
}

Write-Host "`n--- 5. Testing Public Endpoints & Online Booking ---" -ForegroundColor Cyan
$publicInfo = Invoke-RestMethod -Uri "$baseUrl/api/public/info" -Method Get
Write-Host "/api/public/info -> Success=$($publicInfo.success), Klinik=$($publicInfo.data.settings.nama_klinik)" -ForegroundColor Green

$bookingPayload = @{
    namaPasien = "Pasien Test QA"
    nik = "3201999999990001"
    jenisKelamin = "L"
    telepon = "081299998888"
    alamat = "Jl. Uji Petik QA No. 99"
    poliId = 1
    tanggalKunjungan = (Get-Date).ToString("yyyy-MM-dd")
    caraBayar = "umum"
    keluhan = "Uji coba registrasi online oleh tim QA"
} | ConvertTo-Json

$booking = Invoke-RestMethod -Uri "$baseUrl/api/public/booking" -Method Post -Body $bookingPayload -ContentType "application/json"
Write-Host "Online Booking -> Success=$($booking.success), NoKunjungan=$($booking.data.noKunjungan), NoAntrian=#$($booking.data.noAntrianUrut)" -ForegroundColor Green

Write-Host "`n>>> ALL API SMOKE TESTS COMPLETED SUCCESSFULLY! <<<" -ForegroundColor Yellow
