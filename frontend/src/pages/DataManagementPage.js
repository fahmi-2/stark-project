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
            <style jsx>{`
        .page-header-box {
          background: white;
          padding: 24px 32px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          margin-bottom: 24px;
          text-align: center;
        }
        .page-header-box h1 {
          font-size: 28px;
          color: #1e293b;
          margin: 0 0 12px 0;
        }
        .subtitle {
          color: #64748b;
          font-size: 16px;
          max-width: 700px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* === CSS lainnya (cards, guide, dll) tetap seperti sebelumnya === */

        .cards-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 24px;
        }

        .data-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          text-align: center;
          transition: transform 0.2s;
        }
        .data-card:hover {
          transform: translateY(-4px);
        }

        .card-icon {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 28px;
        }

        .data-card h3 {
          font-size: 18px;
          color: #1e293b;
          margin: 0 0 12px 0;
        }
        .card-desc {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: opacity 0.2s;
        }
        .btn:hover:not(:disabled) {
          opacity: 0.9;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary { background: #1e40af; color: white; }
        .btn-success { background: #10b981; color: white; }
        .btn-warning { background: #f59e0b; color: white; }

        .upload-alert {
          padding: 14px 20px;
          border-radius: 8px;
          margin: 24px auto;
          max-width: 600px;
          font-size: 15px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .upload-alert.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        .upload-alert.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .guide-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          margin-top: 24px;
        }
        .guide-card h3 {
          font-size: 20px;
          color: #1e293b;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .columns-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin: 16px 0;
        }
        .column-item {
          background: #f1f5f9;
          padding: 10px;
          border-radius: 6px;
          font-size: 14px;
          text-align: center;
        }
        .note {
          color: #64748b;
          font-size: 14px;
          margin-top: 16px;
        }
        .note code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
        }

        @media (max-width: 768px) {
          .cards-container { grid-template-columns: 1fr; }
          .columns-grid { grid-template-columns: 1fr; }
          .page-header-box { padding: 20px 16px; }
        }
      `}</style>
    </div>
  );
};

export default DataManagementPage;