// src/pages/DataManagementPage.js
import React, { useState } from "react";
import { fetchAPI } from "../utils/api";

const DataManagementPage = () => {
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Download Template Excel
  const handleDownloadTemplate = () => {
    fetchAPI("/api/template", {
      headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengunduh template");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "template_permintaan.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        alert(`❌ Gagal download template: ${err.message}`);
      });
  };

  // Export Semua Data
  const handleExportAllData = () => {
    window.location.href = "/api/export-data?years=all"; // langsung download
  };

  // Import File
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
      alert("❌ Format file tidak didukung. Harap gunakan .xlsx, .xls, atau .csv");
      return;
    }

    setIsUploading(true);
    setUploadStatus("📤 Sedang mengunggah...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetchAPI("/api/import-data", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        setUploadStatus(`✅ Berhasil! ${result.imported} baris ditambahkan.`);
      } else {
        setUploadStatus(`❌ Gagal: ${result.error || "Server error"}`);
      }
    } catch (err) {
      setUploadStatus(`❌ Error jaringan: ${err.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = "";
      setTimeout(() => setUploadStatus(""), 4000);
    }
  };

  return (
    <div className="page-content">
      {/* 🔽 JUDUL DENGAN BOX PUTIH */}
      <div className="page-header-box">
        <h1><i className="fas fa-database"></i> Manajemen Data</h1>
        <p className="subtitle">
          Impor data baru, ekspor laporan, atau unduh template untuk memastikan format sesuai.
        </p>
      </div>

      {/* KARTU UTAMA */}
      <div className="cards-container">
        {/* Kartu 1: Unduh Template */}
        <div className="data-card">
          <div className="card-icon" style={{ background: "#dbeafe", color: "#1e40af" }}>
            <i className="fas fa-file-excel"></i>
          </div>
          <h3>Unduh Template</h3>
          <p className="card-desc">
            File Excel dengan struktur kolom yang benar untuk impor data.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleDownloadTemplate}
            disabled={isUploading}
          >
            <i className="fas fa-download"></i> Download Template (.xlsx)
          </button>
        </div>

        {/* Kartu 2: Ekspor Semua Data */}
        <div className="data-card">
          <div className="card-icon" style={{ background: "#d1fae5", color: "#065f46" }}>
            <i className="fas fa-file-export"></i>
          </div>
          <h3>Ekspor Semua Data</h3>
          <p className="card-desc">
            Unduh seluruh data permintaan dalam format Excel (.xlsx).
          </p>
          <button
            className="btn btn-success"
            onClick={handleExportAllData}
            disabled={isUploading}
          >
            <i className="fas fa-file-download"></i> Export Data (.xlsx)
          </button>
        </div>

        {/* Kartu 3: Impor Data */}
        <div className="data-card">
          <div className="card-icon" style={{ background: "#fef3c7", color: "#92400e" }}>
            <i className="fas fa-file-upload"></i>
          </div>
          <h3>Impor Data</h3>
          <p className="card-desc">
            Unggah file Excel/CSV yang telah diisi sesuai template.
          </p>
          <label htmlFor="importFile" className="btn btn-warning">
            <i className="fas fa-upload"></i> Pilih File Excel/CSV
          </label>
          <input
            id="importFile"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
            style={{ display: "none" }}
            disabled={isUploading}
          />
        </div>
      </div>

      {/* STATUS UPLOAD */}
      {uploadStatus && (
        <div className={`upload-alert ${uploadStatus.startsWith("✅") ? "success" : "error"}`}>
          <i className={`fas ${uploadStatus.startsWith("✅") ? "fa-check-circle" : "fa-exclamation-circle"}`}></i>
          {uploadStatus}
        </div>
      )}

      {/* PANDUAN KOLOM EXCEL */}
      <div className="guide-card">
        <h3><i className="fas fa-book-open"></i> Panduan Kolom Excel</h3>
        <p>File harus memiliki kolom berikut (<strong>case-sensitive</strong>):</p>
        <div className="columns-grid">
          {[
            "Tahun", "UnitPemohon", "NamaBrg", "Kategori",
            "Jumlah", "HargaSatuan", "TotalHarga", "Segmen"
          ].map((col, i) => (
            <div key={i} className="column-item">
              <strong>{col}</strong>
            </div>
          ))}
        </div>
        <p className="note">
          <i className="fas fa-info-circle"></i> Contoh nilai: <code>2025</code>, <code>IT</code>, <code>mouse</code>, <code>ATK</code>, <code>10</code>, <code>50000</code>, <code>500000</code>, <code>Teknologi</code>
        </p>
      </div>
    </div>
  );
};

export default DataManagementPage;