from fastapi import FastAPI
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import unquote
from typing import List
from pydantic import BaseModel
import os
import httpx
import pandas as pd
import traceback
import regex as re
import math
from dotenv import load_dotenv
import google.generativeai as genai
import os

load_dotenv()
# 🔑 Konfigurasi Gemini (lebih aman pakai env var)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set.")

# Model ringan & cepat (gratis sampai kuota habis)
gemini_model = genai.GenerativeModel("gemini-2.0-flash")
def generate_gemini_answer(question: str, data_summary: dict, year_label: str) -> str:
    """
    Mengirim pertanyaan ke Gemini + konteks data ringkas
    """
    try:
        context = f"""Anda adalah asisten analitik permintaan barang.
Data yang tersedia ({year_label}):
- Total permintaan unit: {data_summary['total_requests']:,}
- Total pengeluaran: {format_rupiah(data_summary['total_expenditure'])}
- Barang terlaris: '{data_summary['top_item']}'
- Unit pemohon teraktif: '{data_summary['top_unit']}'
- Jumlah transaksi: {data_summary['transaction_count']:,}

Jawab dalam bahasa Indonesia, singkat, jelas, dan berdasarkan data di atas.
Jika tidak tahu atau di luar cakupan, katakan: "Maaf, data tidak mencakup pertanyaan tersebut."
"""

        prompt = f"{context}\n\nPertanyaan pengguna:\n{question}"

        response = gemini_model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                max_output_tokens=500,
                temperature=0.3,
                top_p=0.9
            )
        )
        return response.text.strip()
    except Exception as e:
        print(f"[GEMINI ERROR] {e}")
        return None
def get_data_summary(years: List[int]) -> dict:
    """Buat ringkasan data ringkas untuk konteks Gemini"""
    data = df[df["Tahun"].isin(years)].copy() if years else df.copy()
    return {
        "total_requests": int(data["Jumlah"].sum()),
        "total_expenditure": float(data["TotalHarga"].sum()),
        "top_item": data.groupby("NamaBrg")["Jumlah"].sum().idxmax() if not data.empty else "Tidak ada",
        "top_unit": data.groupby("UnitPemohon")["Jumlah"].sum().idxmax() if not data.empty else "Tidak ada",
        "transaction_count": len(data),
        "year_range": f"tahun {min(years)}–{max(years)}" if years else "semua tahun (2023–2025)"
    }
# Contoh: ambil dari df atau database
def get_dashboard_data(year="2025"):
    data = df[df["Tahun"] == int(year)].copy()
    if data.empty:
        return {
            "total_requests": 0, "total_expenditure": 0,
            "top_units": [], "top_items": [], "categories": {}
        }
    total_requests = int(data["Jumlah"].sum())
    total_expenditure = float(data["TotalHarga"].sum())
    top_units = (
        data.groupby("UnitPemohon")
        .agg(TotalPengeluaran=("TotalHarga", "sum"))
        .reset_index().nlargest(3, "TotalPengeluaran").to_dict("records")
    )
    top_items = (
        data.groupby("NamaBrg")
        .agg(Jumlah=("Jumlah", "sum"))
        .reset_index().nlargest(3, "Jumlah").to_dict("records")
    )
    categories = (
        data.groupby("Kategori")["TotalHarga"].sum().to_dict()
    )
    return {
        "total_requests": total_requests,
        "total_expenditure": total_expenditure,
        "top_units": top_units,
        "top_items": top_items,
        "categories": categories
    }

# ====================
# ✅ Setup Aplikasi
# ====================
app = FastAPI(debug=True)  # Tambahkan debug=True

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Izinkan semua domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ====================
# ✅ Load & Clean Data
# ====================

csv_path = "./data/Data_SPC.csv"

df = pd.read_csv(csv_path)

# Normalisasi nama kolom
df = df.rename(columns={
    "Tanggal": "Tanggal",
    "Kode Transaksi": "NomorSurat",
    "Pemohon": "Pemohon",
    "Unit Pemohon": "UnitPemohon",
    "Kode Barang": "KodeBarang",
    "Nama Brg": "NamaBrg",
    "Satuan": "Satuan",
    "Jml": "Jumlah",
    "Harga": "HargaSatuan",
    "Total": "TotalHarga",
    "Tahun": "Tahun",
    "Kategori Barang": "GrupBarang",
    "Kategori": "Kategori"
})

# Bersihkan kolom numerik — jangan paksa jadi int dulu!
numeric_cols = ["Jumlah", "HargaSatuan", "TotalHarga"]
for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

# Kolom Tahun: pastikan jadi integer (hapus desimal & NaN)
df["Tahun"] = pd.to_numeric(df["Tahun"], errors="coerce")
df = df.dropna(subset=["Tahun"])  # hapus baris tanpa tahun
# ✅ Konversi kolom Tanggal ke datetime (global, sekali saja)
df["Tanggal"] = pd.to_datetime(df["Tanggal"], dayfirst=True, errors="coerce")

# Validasi kolom penting
required_cols = ["Jumlah", "TotalHarga",
                 "UnitPemohon", "NamaBrg", "Kategori", "Tahun"]
for col in required_cols:
    if col not in df.columns:
        raise ValueError(f"Kolom '{col}' tidak ditemukan di data CSV!")


def parse_years_param(years_param: str):
    if not years_param or years_param.lower() == "all":
        return sorted(df["Tahun"].unique().tolist())
    try:
        return sorted(set(int(y.strip()) for y in years_param.split(",") if y.strip().isdigit()))
    except:
        return [2025]
    
# ====================
# ✅ Hitung & Tambahkan Kolom Segmen
# ====================
# Agregasi dasar per Unit Pemohon untuk menghitung ambang batas
unit_agg_for_segmen = df.groupby("UnitPemohon").agg(
    TotalPermintaan=("Jumlah", "sum"),
    TotalPengeluaran=("TotalHarga", "sum")
).reset_index()

# Ambang batas
permintaan_vals = unit_agg_for_segmen["TotalPermintaan"]
p33 = permintaan_vals.quantile(0.33)
p66 = permintaan_vals.quantile(0.66)

pengeluaran_vals = unit_agg_for_segmen["TotalPengeluaran"]
e33 = pengeluaran_vals.quantile(0.33)
e66 = pengeluaran_vals.quantile(0.66)

# Mapping
unit_to_label_segmen = {}
unit_to_segmen = {}
for _, row in unit_agg_for_segmen.iterrows():
    total_permintaan = row["TotalPermintaan"]
    total_pengeluaran = row["TotalPengeluaran"]
    label_segmen = "Tinggi" if total_permintaan >= p66 else "Sedang" if total_permintaan >= p33 else "Rendah"
    segmen = "Boros" if total_pengeluaran >= e66 else "Sedang" if total_pengeluaran >= e33 else "Hemat"
    unit_to_label_segmen[row["UnitPemohon"]] = label_segmen
    unit_to_segmen[row["UnitPemohon"]] = segmen

# Tambahkan ke df
df["label_segmen"] = df["UnitPemohon"].map(unit_to_label_segmen).fillna("Rendah")
df["segmen"] = df["UnitPemohon"].map(unit_to_segmen).fillna("Hemat")


# =====================================================
# ✅ Endpoint 1: Ringkasan Keseluruhan Semua Data
# =====================================================


@app.get("/api/data")
def get_all_data():
    data = df.copy()
    return {
        "totalRequests": int(data["Jumlah"].sum()),
        "outflowValueFormatted": f"Rp{float(data['TotalHarga'].sum()):,.0f}".replace(",", "."),
        "totalUniqueRequesters": int(data["UnitPemohon"].nunique()),
        "fastMovingItems": df.groupby("NamaBrg")["Jumlah"].sum().idxmax() if not df.empty else "Tidak ada",
        "topItems": (
            df.groupby(["Kategori", "NamaBrg"])
            .agg(Terjual=("Jumlah", "sum"))
            .reset_index()
            .nlargest(5, "Terjual")
            .to_dict("records")
        ),
        "totalData": len(data)
    }

# =====================================================
# ✅ Endpoint 2: Ringkasan & Top 5 Barang per Tahun
# =====================================================
import numpy as np
from fastapi import HTTPException

@app.get("/api/data-per-tahun")
async def get_data_per_tahun():
    try:
        # Validasi df
        if 'df' not in globals() or df.empty:
            raise ValueError("DataFrame 'df' tidak tersedia.")

        hasil = {}

        # Langkah 1: Ambil tahun unik, drop NaN, konversi ke Python int, lalu ke str (paling aman untuk key JSON)
        tahun_series = df["Tahun"].dropna()
        if tahun_series.empty:
            return {}

        # Konversi ke int dulu (handle float/str), lalu ke str
        try:
            tahun_ints = pd.to_numeric(tahun_series, errors='coerce').dropna().astype(int)
        except Exception as e:
            raise ValueError(f"Gagal mengonversi kolom 'Tahun' ke angka: {e}")

        tahun_list = sorted(tahun_ints.unique())

        for tahun in tahun_list:
            # 🔑 KUNCI: Pastikan key adalah string (JSON hanya izinkan string sebagai key)
            tahun_key = str(int(tahun))  # double cast: numpy → int → str

            data_tahun = df[df["Tahun"] == tahun]

            if data_tahun.empty:
                hasil[tahun_key] = {
                    "totalRequests": 0,
                    "outflowValueFormatted": "Rp0",
                    "totalUniqueRequesters": 0,
                    "fastMovingItems": "Tidak ada",
                    "topItems": []
                }
                continue

            # 🔢 Semua nilai numerik: cast ke Python native
            totalRequests = int(data_tahun["Jumlah"].sum())  # ← int() mengonversi numpy → Python int
            outflowValue = float(data_tahun["TotalHarga"].sum())  # ← float() → Python float

            # Format rupiah (aman untuk float/int Python)
            def format_rupiah(val: float) -> str:
                val = abs(val)
                rupiah = f"{val:,.0f}".replace(",", ".")
                return f"Rp{rupiah}"

            outflowValueFormatted = format_rupiah(outflowValue)
            totalUniqueRequesters = int(data_tahun["UnitPemohon"].nunique())

            # Top 5
            top_items_agg = (
                data_tahun.groupby(["Kategori", "NamaBrg"], as_index=False)
                .agg(
                    TotalPermintaan=("Jumlah", "sum"),
                    TopRequester=("UnitPemohon", lambda x: x.mode().iloc[0] if not x.mode().empty else "N/A")
                )
                .nlargest(5, "TotalPermintaan")
            )

            top_items = []
            for _, row in top_items_agg.iterrows():
                # 🛡️ Cast setiap nilai ke tipe Python!
                top_items.append({
                    "Kategori": str(row["Kategori"]),
                    "NamaBrg": str(row["NamaBrg"]),
                    "TopRequester": str(row["TopRequester"]),
                    "Terjual": int(row["TotalPermintaan"])  # ← ini sering numpy.int64!
                })

            fastMovingItems = top_items[0]["NamaBrg"] if top_items else "Tidak ada"

            hasil[tahun_key] = {
                "totalRequests": totalRequests,
                "outflowValueFormatted": outflowValueFormatted,
                "totalUniqueRequesters": totalUniqueRequesters,
                "fastMovingItems": fastMovingItems,
                "topItems": top_items
            }

        return hasil

    except Exception as e:
        import traceback
        print("[ERROR] Traceback lengkap:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
    
# =====================================================
# ✅ Root Endpoint
# =====================================================


@app.get("/")
async def root():
    return {
        "message": "Backend API berjalan. Gunakan /api/data untuk ringkasan total & /api/data-per-tahun untuk ringkasan per tahun."
    }
# ====================
# ✅ Tambahkan di bagian akhir main.py (setelah endpoint lainnya)
# ====================

# =====================================================
# ✅ Endpoint 3: Dashboard Metrics (Aman untuk JSON)
# =====================================================


@app.get("/api/dashboard-metrics")
async def get_dashboard_metrics(years: str = "2025"):
    try:
        # Parse tahun dari parameter
        selected_years = parse_years_param(years)
        if not selected_years:
            selected_years = [2025]

        # Filter data hanya untuk tahun yang dipilih
        data = df[df["Tahun"].isin(selected_years)].copy()

        if data.empty:
            # Jika tidak ada data, kembalikan nilai kosong
            return {
                "metrics": {
                    "totalRequests": {"value": 0, "changeText": "Tidak ada data", "isPositive": None},
                    "outflowValue": {"value": "Rp0", "changeText": "Tidak ada data", "isPositive": None},
                    "totalUniqueRequesters": {"value": 0, "changeText": "Tidak ada data", "isPositive": None},
                    "totalUniqueSKUs": {"value": 0, "changeText": "Tidak ada data", "isPositive": None}
                }
            }

        # Hitung metrik utama dari data yang difilter
        total_requests = int(data["Jumlah"].sum())
        outflow_value = float(data["TotalHarga"].sum())
        unique_requesters = int(data["UnitPemohon"].nunique())
        unique_skus = int(data["NamaBrg"].nunique())

        # Format Rupiah
        def format_rupiah(value):
            if value >= 1_000_000_000:
                return f"Rp{value / 1_000_000_000:.1f}M"
            elif value >= 1_000_000:
                return f"Rp{value / 1_000_000:.1f}jt"
            else:
                return f"Rp{value:,.0f}".replace(",", ".")

        # Jika hanya SATU tahun dipilih → hitung perbandingan vs tahun lalu
        change_text = ""
        is_positive = None
        if len(selected_years) == 1:
            target_year = selected_years[0]
            prev_year = target_year - 1

            prev_data = df[df["Tahun"] == prev_year]
            prev_requests = int(
                prev_data["Jumlah"].sum()) if not prev_data.empty else 0

            # Contoh untuk totalRequests
            if prev_requests == 0:
                change_text = "Data tahun lalu tidak ada"
            else:
                change_pct = round(
                    ((total_requests - prev_requests) / prev_requests) * 100, 1)
                sign = "↑" if change_pct > 0 else "↓"
                change_text = f"{sign} {abs(change_pct):.1f}% vs Tahun Lalu"
                is_positive = change_pct > 0
        else:
            # Jika multi-tahun → tidak ada perbandingan
            change_text = "Total gabungan"
            is_positive = None

        return {
            "metrics": {
                "totalRequests": {
                    "value": total_requests,
                    "changeText": change_text,
                    "isPositive": is_positive
                },
                "outflowValue": {
                    "value": (outflow_value),
                    "changeText": change_text,  # atau buat perhitungan terpisah untuk outflow
                    "isPositive": is_positive
                },
                "totalUniqueRequesters": {
                    "value": unique_requesters,
                    "changeText": "Total unit unik",
                    "isPositive": None
                },
                "totalUniqueSKUs": {
                    "value": unique_skus,
                    "changeText": "Total barang unik",
                    "isPositive": None
                }
            }
        }

    except Exception as e:
        print(f"[ERROR] Dashboard Metrics ({years}): {e}")
        import traceback
        traceback.print_exc()
        return {
            "metrics": {
                "totalRequests": {"value": 0, "changeText": "Error", "isPositive": None},
                "outflowValue": {"value": "Rp0", "changeText": "Error", "isPositive": None},
                "totalUniqueRequesters": {"value": 0, "changeText": "Error", "isPositive": None},
                "totalUniqueSKUs": {"value": 0, "changeText": "Error", "isPositive": None}
            }
        }


# =====================================================
# ✅ Endpoint 4: Data Bulanan per Tahun
# =====================================================
@app.get("/api/monthly-demand")
async def get_monthly_demand(years: str = "2025"):
    """
    Ambil total permintaan (unit) per bulan dari satu atau banyak tahun.
    """
    try:
        selected_years = parse_years_param(years)
        if not selected_years:
            return {"monthlyDemand": [0] * 12}

        data = df[df["Tahun"].isin(selected_years)].copy()
        if data.empty:
            return {"monthlyDemand": [0] * 12}

        data["Tanggal"] = pd.to_datetime(
            data["Tanggal"], dayfirst=True, errors="coerce")
        data = data.dropna(subset=["Tanggal"])
        data["Bulan"] = data["Tanggal"].dt.month

        monthly = (
            data.groupby("Bulan")["Jumlah"]
            .sum()
            .reindex(range(1, 13), fill_value=0)
            .tolist()
        )

        return {"monthlyDemand": monthly}

    except Exception as e:
        print(f"[ERROR] Monthly Demand ({years}): {e}")
        return {"monthlyDemand": [0] * 12}


@app.get("/api/monthly-outcome/{year}")
async def get_monthly_outcome(year: int):
    try:
        # Salin data untuk menghindari efek samping
        temp_df = df.copy()

        # 1. Parse Tanggal dengan benar (format: DD/MM/YYYY)
        temp_df["Tanggal"] = pd.to_datetime(
            temp_df["Tanggal"], dayfirst=True, errors="coerce")
        temp_df = temp_df.dropna(subset=["Tanggal"])

        # 2. Ekstrak Tahun dan Bulan dari Tanggal (lebih akurat)
        temp_df["Tahun"] = temp_df["Tanggal"].dt.year
        temp_df["Bulan"] = temp_df["Tanggal"].dt.month

        # 3. Filter data berdasarkan tahun yang diminta
        data = temp_df[temp_df["Tahun"] == year]
        if data.empty:
            return {"monthlyDemand": [0] * 12}

        # 4. Pastikan kolom 'Jml' dan 'Harga' numerik
        data["Jml"] = pd.to_numeric(data["Jml"], errors="coerce")
        data["Harga"] = pd.to_numeric(data["Harga"], errors="coerce")

        # 5. Hitung Total = Jml * Harga (abaikan baris dengan NaN)
        data = data.dropna(subset=["Jml", "Harga"])
        data["Total"] = data["Jml"] * data["Harga"]

        # 6. Agregasi total pengeluaran per bulan (1–12)
        monthly_sum = data.groupby("Bulan")["Total"].sum()
        full_year = monthly_sum.reindex(
            range(1, 13), fill_value=0).sort_index()

        # 7. Konversi ke integer (pembulatan ke Rupiah terdekat)
        result = [int(round(x)) for x in full_year.tolist()]
        return {"monthlyDemand": result}

    except Exception as e:
        print(f"[ERROR] Gagal memuat data pengeluaran bulanan {year}: {e}")
        import traceback
        traceback.print_exc()
        return {"monthlyDemand": [0] * 12}


# =====================================================
# ✅ Endpoint 5: Kategori & Top Items per Tahun
# =====================================================
@app.get("/api/category-and-top-items")
async def get_category_and_top_items(years: str = "2025"):
    try:
        # Parse years
        selected_years = parse_years_param(years)
        if not selected_years:
            return {
                "categoryValueLabels": [],
                "categoryValueData": [],
                "topItems": []
            }

        data = df[df["Tahun"].isin(selected_years)].copy()
        if data.empty:
            return {
                "categoryValueLabels": [],
                "categoryValueData": [],
                "topItems": []
            }

        # Agregasi kategori
        category_agg = (
            data.groupby("Kategori")["TotalHarga"]
            .sum()
            .nlargest(6)
            .reset_index()
        )

        # Top 5 barang
        top_items_agg = (
            data.groupby(["Kategori", "NamaBrg", "label_segmen"])
            .agg(
                TotalPermintaan=("Jumlah", "sum"),
                TopRequester=("UnitPemohon", lambda x: x.mode(
                ).iloc[0] if not x.mode().empty else "N/A")
            )
            .reset_index()
            .nlargest(5, "TotalPermintaan")
        )

        top_items = []
        for _, row in top_items_agg.iterrows():
            top_items.append({
                "Kategori": row["Kategori"],
                "Nama Brg": row["NamaBrg"],
                "Terjual": int(row["TotalPermintaan"]),
                "TopRequester": row["TopRequester"],
                "DemandClass": row["label_segmen"]
            })

        return {
            "categoryValueLabels": category_agg["Kategori"].tolist(),
            "categoryValueData": [float(x) for x in category_agg["TotalHarga"].tolist()],
            "topItems": top_items
        }

    except Exception as e:
        print(f"[ERROR] Category & Top Items ({years}): {e}")
        import traceback
        traceback.print_exc()
        return {
            "categoryValueLabels": [],
            "categoryValueData": [],
            "topItems": []
        }
    # =====================================================
# ✅ Endpoint 6: Dashboard Metrics per Tahun
# =====================================================


@app.get("/api/dashboard-metrics/{year}")
async def get_dashboard_metrics_by_year(year: int):
    try:
        # Ambil data tahun ini
        current_data = df[df["Tahun"] == year]
        if current_data.empty:
            return {
                "error": f"Tidak ada data untuk tahun {year}",
                "data": {}
            }

        # Cari tahun sebelumnya
        previous_year = year - 1
        previous_data = df[df["Tahun"] == previous_year]

        # Hitung metrik tahun ini
        total_requests_current = int(
            current_data["Jumlah"].sum()) if not current_data.empty else 0
        outflow_value_current = float(
            current_data["TotalHarga"].sum()) if not current_data.empty else 0.0
        unique_requesters_current = int(
            current_data["UnitPemohon"].nunique()) if not current_data.empty else 0
        unique_skus_current = int(
            current_data["NamaBrg"].nunique()) if not current_data.empty else 0

        # Hitung metrik tahun lalu
        total_requests_prev = int(
            previous_data["Jumlah"].sum()) if not previous_data.empty else 0
        outflow_value_prev = float(
            previous_data["TotalHarga"].sum()) if not previous_data.empty else 0.0
        unique_requesters_prev = int(
            previous_data["UnitPemohon"].nunique()) if not previous_data.empty else 0
        unique_skus_prev = int(
            previous_data["NamaBrg"].nunique()) if not previous_data.empty else 0

        # Helper
        def calc_change(curr, prev):
            return "N/A" if prev == 0 else round(((curr - prev) / prev) * 100, 1)

        def format_change(val):
            if val == "N/A":
                return "N/A"
            sign = "↑" if val > 0 else "↓"
            return f"{sign} {abs(val):.1f}% vs Tahun Lalu"

        def format_rupiah(value):
            if value >= 1_000_000_000:
                return f"Rp{value / 1_000_000_000:.1f}M"
            elif value >= 1_000_000:
                return f"Rp{value / 1_000_000:.1f}jt"
            else:
                return f"Rp{value:,.0f}".replace(",", ".")

        return {
            "current_year": year,
            "previous_year": previous_year,
            "metrics": {
                "totalRequests": {
                    "value": total_requests_current,
                    "changeText": format_change(calc_change(total_requests_current, total_requests_prev)),
                    "isPositive": calc_change(total_requests_current, total_requests_prev) > 0 if calc_change(total_requests_current, total_requests_prev) != "N/A" else None
                },
                "outflowValue": {
                    "value": (outflow_value_current),
                    "changeText": format_change(calc_change(outflow_value_current, outflow_value_prev)),
                    "isPositive": calc_change(outflow_value_current, outflow_value_prev) > 0 if calc_change(outflow_value_current, outflow_value_prev) != "N/A" else None
                },
                "totalUniqueRequesters": {
                    "value": unique_requesters_current,
                    "changeText": format_change(calc_change(unique_requesters_current, unique_requesters_prev)),
                    "isPositive": calc_change(unique_requesters_current, unique_requesters_prev) > 0 if calc_change(unique_requesters_current, unique_requesters_prev) != "N/A" else None
                },
                "totalUniqueSKUs": {
                    "value": unique_skus_current,
                    "changeText": format_change(calc_change(unique_skus_current, unique_skus_prev)),
                    "isPositive": calc_change(unique_skus_current, unique_skus_prev) > 0 if calc_change(unique_skus_current, unique_skus_prev) != "N/A" else None
                }
            }
        }

    except Exception as e:
        print(f"[ERROR] Dashboard Metrics by Year: {e}")
        return {"error": "Internal Server Error", "detail": str(e)}
    # =====================================================
# ✅ Endpoint 7: Top 5 Unit Pemohon per Tahun
# =====================================================


@app.get("/api/top-requesters")
async def get_top_requesters(years: str = "2025"):
    selected_years = parse_years_param(years)
    if not selected_years:
        return {"topRequesters": []}

    data = df[df["Tahun"].isin(selected_years)].copy()
    if data.empty:
        return {"topRequesters": []}

    agg = (
        data.groupby("UnitPemohon")
        .agg(
            TotalPermintaan=("Jumlah", "sum"),
            TotalPengeluaran=("TotalHarga", "sum"),
            Kategori=("Kategori", "first"),
            label_segmen=("label_segmen", "first") # <-- ERROR: Kolom 'label_segmen' TIDAK ADA!
        )
        .reset_index()
        .nlargest(10, "TotalPermintaan")
    )

    top_requesters = []
    for _, row in agg.iterrows():
        top_requesters.append({
            "Kategori": row["Kategori"],
            "UnitPemohon": row["UnitPemohon"],
            "TotalPermintaan": int(row["TotalPermintaan"]) if not pd.isna(row["TotalPermintaan"]) else 0,
            "TotalPengeluaran": safe_float(row["TotalPengeluaran"]),
            "KelasPermintaan": row["label_segmen"]
        })

    return {"topRequesters": top_requesters}
# =====================================================
# ✅ Endpoint Baru: Kategori Berdasarkan Jumlah Unit (bukan nilai uang)
# =====================================================


@app.get("/api/category-value/{year}")
async def get_category_value(year: int):
    try:
        data = df[df["Tahun"] == year].copy()
        if data.empty:
            return {"labels": [], "data": []}
        # Agregasi kategori → total nilai pengeluaran
        category_agg = (
            data.groupby("Kategori")["TotalHarga"]
            .sum()
            .nlargest(6)  # Ambil 6 kategori teratas
            .reset_index()
        )
        return {
            "labels": category_agg["Kategori"].tolist(),
            "data": [float(x) for x in category_agg["TotalHarga"].tolist()],
        }
    except Exception as e:
        print(f"[ERROR] Category Value: {e}")
        return {"labels": [], "data": []}


@app.get("/api/category-unit/{year}")
async def get_category_unit(year: int):
    try:
        data = df[df["Tahun"] == year].copy()
        if data.empty:
            return {"labels": [], "data": []}
        # Agregasi kategori → total unit permintaan
        category_agg = (
            data.groupby("Kategori")["Jumlah"]
            .sum()
            .nlargest(6)  # Ambil 6 kategori teratas
            .reset_index()
        )
        return {
            "labels": category_agg["Kategori"].tolist(),
            "data": [int(x) for x in category_agg["Jumlah"].tolist()],
        }
    except Exception as e:
        print(f"[ERROR] Category Unit: {e}")
        return {"labels": [], "data": []}


@app.get("/api/all-items/{year}")
def get_all_items(year: int):
    data = df[df["Tahun"] == year].copy()
    if data.empty:
        return {"items": []}
    item_agg = (
        data.groupby(["Kategori", "NamaBrg"])
        .agg(TotalPermintaan=("Jumlah", "sum"), TotalHarga=("TotalHarga", "sum"))
        .reset_index()
    )
    item_agg["HargaSatuan"] = (item_agg["TotalHarga"] / item_agg["TotalPermintaan"]).fillna(0).round(2)
    items = item_agg.sort_values("TotalPermintaan", ascending=False).to_dict("records")
    for item in items:
        item["TotalPermintaan"] = int(item["TotalPermintaan"])
        item["HargaSatuan"] = float(item["HargaSatuan"])
    return {"items": items}

@app.get("/api/item-detail/{year}/{item_name}")
def get_item_detail_by_name(year: int, item_name: str):
    try:
        decoded_item = unquote(item_name).replace("-", "/")
        filtered = df[(df["Tahun"] == year) & (df["NamaBrg"] == decoded_item)]
        if filtered.empty:
            return {"units": []}
        unit_agg = (
            filtered.groupby("UnitPemohon")
            .agg(Jumlah=("Jumlah", "sum"), TotalPengeluaran=("TotalHarga", "sum"))
            .reset_index()
            .sort_values("Jumlah", ascending=False)
        )
        return {
            "units": unit_agg.to_dict("records")
        }
    except Exception as e:
        print(f"[ERROR] Item Detail: {e}")
        return {"units": []}
# =====================================================
# ✅ Endpoint 9: ChatBot Query (Dynamic)
# =====================================================
# Helper: Format Rupiah


def format_rupiah(value):
    if value >= 1_000_000_000:
        return f"Rp{(value / 1_000_000_000):.1f}M"
    elif value >= 1_000_000:
        return f"Rp{(value / 1_000_000):.1f}jt"
    else:
        return f"Rp{value:,.0f}".replace(",", ".")


# =====================================================
# ✅ Endpoint 9: ChatBot Query (Dynamic & Smart)
# =====================================================

def format_rupiah(value):
    if value >= 1_000_000_000:
        return f"Rp{(value / 1_000_000_000):.1f}M"
    elif value >= 1_000_000:
        return f"Rp{(value / 1_000_000):.1f}jt"
    else:
        return f"Rp{value:,.0f}".replace(",", ".")
    
# === Endpoint: Daftar Semua Unit Pemohon dengan Segmen & Kategori ===


@app.get("/api/unit-pemohon-list")
async def get_unit_pemohon_list():
    try:
        # Agregasi dasar per Unit Pemohon
        unit_agg = df.groupby("UnitPemohon").agg(
            TotalPermintaan=("Jumlah", "sum"),
            TotalPengeluaran=("TotalHarga", "sum"),
            Kategori=("Kategori", "first")
        ).reset_index()

        if unit_agg.empty:
            return {"units": []}

        # === Tentukan ambang batas untuk Permintaan (Jumlah) ===
        permintaan_vals = unit_agg["TotalPermintaan"]
        p33 = permintaan_vals.quantile(0.33)
        p66 = permintaan_vals.quantile(0.66)

        # === Tentukan ambang batas untuk Pengeluaran (Uang) ===
        pengeluaran_vals = unit_agg["TotalPengeluaran"]
        e33 = pengeluaran_vals.quantile(0.33)
        e66 = pengeluaran_vals.quantile(0.66)

        result = []
        for _, row in unit_agg.iterrows():
            total_permintaan = row["TotalPermintaan"]
            total_pengeluaran = row["TotalPengeluaran"]

            # Klasifikasi Permintaan (Jumlah Unit) → untuk LabelSegmen
            if total_permintaan >= p66:
                label_segmen = "Tinggi"
            elif total_permintaan >= p33:
                label_segmen = "Sedang"
            else:
                label_segmen = "Rendah"

            # Klasifikasi Pengeluaran (Uang) → untuk Segmen
            if total_pengeluaran >= e66:
                segmen = "Boros"
            elif total_pengeluaran >= e33:
                segmen = "Sedang"
            else:
                segmen = "Hemat"

            result.append({
                "UnitPemohon": row["UnitPemohon"],
                "TotalPermintaan": int(total_permintaan),
                "TotalPengeluaran": float(total_pengeluaran),
                "Kategori": row["Kategori"] or "Lainnya",
                "Segmen": segmen,          # berdasarkan uang → Tinggi/Sedang/Rendah
                "LabelSegmen": label_segmen  # berdasarkan jumlah → Tinggi/Sedang/Rendah
            })

        return {"units": result}
    except Exception as e:
        print(f"[ERROR] Unit Pemohon List: {e}")
        return {"units": []}


# === Endpoint: Detail Barang Bulanan per Unit & Tahun ===
@app.get("/api/unit-item-monthly")
async def get_unit_item_monthly(unit: str, year: int):
    try:
        data = df[
            (df["UnitPemohon"] == unit) &
            (df["Tahun"] == year)
        ].copy()

        if data.empty:
            return {"items": []}

        data["Tanggal"] = pd.to_datetime(
            data["Tanggal"], dayfirst=True, errors="coerce")
        data = data.dropna(subset=["Tanggal"])
        data["Bulan"] = data["Tanggal"].dt.month

        monthly_agg = data.groupby(["NamaBrg", "Bulan"])[
            "Jumlah"].sum().reset_index()
        pivot = monthly_agg.pivot(
            index="NamaBrg", columns="Bulan", values="Jumlah").fillna(0)

        for bulan in range(1, 13):
            if bulan not in pivot.columns:
                pivot[bulan] = 0
        pivot = pivot.reindex(sorted(pivot.columns), axis=1)

        items = []
        for nama_brg in pivot.index:
            bulan_data = [int(pivot.loc[nama_brg, bulan])
                          for bulan in range(1, 13)]
            total = sum(bulan_data)
            items.append({
                "NamaBarang": nama_brg,
                "Total": total,
                "Bulanan": bulan_data  # [Jan, Feb, ..., Des]
            })

        items.sort(key=lambda x: x["Total"], reverse=True)
        return {"items": items}

    except Exception as e:
        print(f"[ERROR] Unit Item Monthly ({unit}, {year}): {e}")
        return {"items": []}
# === Endpoint: Data untuk Scatter Plot (semua unit) ===
# === Endpoint: Data untuk Scatter Plot (semua unit) DENGAN FILTER TAHUN ===


@app.get("/api/unit-scatter-data")
async def get_unit_scatter_data(years: str = "all"):
    try:
        # Parse tahun dari parameter
        selected_years = parse_years_param(years)
        if not selected_years:
            return {"units": []}

        # Filter data berdasarkan tahun yang dipilih
        data = df[df["Tahun"].isin(selected_years)].copy()
        if data.empty:
            return {"units": []}

        # Hitung ambang batas global berdasarkan data yang difilter
        all_units_agg = data.groupby("UnitPemohon").agg(
            TotalPengeluaran=("TotalHarga", "sum")
        )
        if all_units_agg.empty:
            return {"units": []}

        e33 = all_units_agg["TotalPengeluaran"].quantile(0.33)
        e66 = all_units_agg["TotalPengeluaran"].quantile(0.66)

        # Agregasi utama berdasarkan data yang difilter
        agg = data.groupby("UnitPemohon").agg(
            TotalPermintaan=("Jumlah", "sum"),
            TotalPengeluaran=("TotalHarga", "sum")
        ).reset_index()

        result = []
        for _, row in agg.iterrows():
            total_pengeluaran = safe_float(row["TotalPengeluaran"])
            # Klasifikasi segmen berdasarkan ambang batas dari data yang difilter
            if total_pengeluaran >= e66:
                segmen = "Boros"
            elif total_pengeluaran >= e33:
                segmen = "Sedang"
            else:
                segmen = "Hemat"
            result.append({
                "UnitPemohon": row["UnitPemohon"],
                "TotalPermintaan": int(row["TotalPermintaan"]),
                "TotalPengeluaran": float(row["TotalPengeluaran"]),
                "Segmen": segmen # <-- ERROR: Kolom 'segmen' TIDAK ADA!
            })
        return {"units": result}
    except Exception as e:
        print(f"[ERROR] Scatter Data ({years}): {e}")
        import traceback
        traceback.print_exc()
        return {"units": []}


# === Endpoint: Data Radar per Unit ===
# === Endpoint: Data Radar per Unit (DIPERBAIKI) ===
@app.get("/api/data-radar")
async def get_data_radar(unit: str):
    try:
        data = df[df["UnitPemohon"] == unit].copy()
        if data.empty:
            return {
                "scores": {},
                "cluster": "Tidak Diketahui",
                "description": "Tidak ada data"
            }

        # Hitung metrik dasar
        total_permintaan = int(data["Jumlah"].sum())
        total_pengeluaran = float(data["TotalHarga"].sum())
        rata_harga = total_pengeluaran / total_permintaan if total_permintaan > 0 else 0
        keragaman_kategori = int(data["Kategori"].nunique())
        jumlah_transaksi = len(data)
        efisiensi = total_permintaan / jumlah_transaksi if jumlah_transaksi > 0 else 0

        # 🔹 Frekuensi permintaan per bulan — Tanggal SUDAH datetime!
        if "Tanggal" in data.columns and data["Tanggal"].notna().any():
            jumlah_bulan = len(data["Tanggal"].dt.to_period("M").unique())
            frekuensi = total_permintaan / jumlah_bulan if jumlah_bulan > 0 else 0
        else:
            frekuensi = 0

        # --- Hitung rentang global untuk normalisasi (semua unit) ---
        all_units = df.groupby("UnitPemohon").agg(
            TotalPermintaan=("Jumlah", "sum"),
            TotalPengeluaran=("TotalHarga", "sum"),
            RataHarga=("TotalHarga", lambda x: x.sum() /
                       df.loc[x.index, "Jumlah"].sum() if x.sum() > 0 else 0),
            Efisiensi=("Jumlah", lambda x: x.sum() /
                       len(x) if len(x) > 0 else 0),
            Keragaman=("Kategori", "nunique")
        ).dropna()

        # Tambahkan Frekuensi ke all_units
        freq_series = df.groupby("UnitPemohon").apply(
            lambda x: x["Jumlah"].sum() /
            len(x["Tanggal"].dt.to_period("M").unique())
            if x["Tanggal"].notna().any() else 0
        )
        all_units["Frekuensi"] = freq_series

        # Fungsi normalisasi ke skala 0–10
        def to_10_scale(value, col):
            if col not in all_units.columns or all_units[col].empty:
                return 5.0
            series = all_units[col]
            min_val = series.quantile(0.1)
            max_val = series.quantile(0.9)
            if max_val <= min_val:
                return 5.0
            score = 10 * ((value - min_val) / (max_val - min_val))
            return round(max(0, min(10, score)), 1)

        # --- Hitung skor 0–10 untuk 7 dimensi ---
        scores = {
            "Total Anggaran Digunakan": to_10_scale(total_pengeluaran, "TotalPengeluaran"),
            "Volume Permintaan": to_10_scale(total_permintaan, "TotalPermintaan"),
            "Rata-rata Biaya per Item": to_10_scale(rata_harga, "RataHarga"),
            "Efisiensi Pengadaan": to_10_scale(efisiensi, "Efisiensi"),
            "Frekuensi Permintaan": to_10_scale(frekuensi, "Frekuensi"),
            "Diversitas Permintaan": to_10_scale(keragaman_kategori, "Keragaman"),
            "Segmen Keuangan": 0  # diisi manual
        }

        # --- Segmen Keuangan → skor 0–10 ---
        pengeluaran_vals = all_units["TotalPengeluaran"]
        e33, e66 = pengeluaran_vals.quantile(
            0.33), pengeluaran_vals.quantile(0.66)
        if total_pengeluaran >= e66:
            segmen_skor = 10.0
            segmen_label = "Tinggi"
        elif total_pengeluaran >= e33:
            segmen_skor = 5.0
            segmen_label = "Sedang"
        else:
            segmen_skor = 0.0
            segmen_label = "Rendah"
        scores["Segmen Keuangan"] = segmen_skor

        # --- Clustering ---
        a = scores["Total Anggaran Digunakan"]
        e = scores["Efisiensi Pengadaan"]
        d = scores["Diversitas Permintaan"]
        if a <= 3 and e >= 7:
            cluster = "Hemat & Efisien"
        elif a >= 7 and e <= 3:
            cluster = "Boros & Tidak Efisien"
        elif d >= 7:
            cluster = "Multikategori"
        else:
            cluster = "Umum"
        desc = "Pola permintaan seimbang"

        return {
            "scores": scores,
            "cluster": cluster,
            "description": desc,
            "raw": {
                "TotalPengeluaran": total_pengeluaran,
                "TotalPermintaan": total_permintaan,
                "RataHarga": rata_harga,
                "Efisiensi": efisiensi,
                "Keragaman": keragaman_kategori,
                "Segmen": segmen_label
            }
        }

    except Exception as e:
        print(f"[ERROR] Radar Data for {unit}: {e}")
        import traceback
        traceback.print_exc()
        return {
            "scores": {},
            "cluster": "Error",
            "description": "Gagal menghitung",
            "raw": {}
        }


@app.get("/api/monthly-expenditure")
async def get_monthly_expenditure(years: str = "2025"):
    """
    Ambil total pengeluaran per bulan dari satu atau banyak tahun.
    Contoh:
      /api/monthly-expenditure?years=2024,2025
      /api/monthly-expenditure?years=all
    """
    try:
        selected_years = parse_years_param(years)
        if not selected_years:
            return {"monthlyExpenditure": [0] * 12}

        # Filter data berdasarkan tahun yang dipilih
        data = df[df["Tahun"].isin(selected_years)].copy()
        if data.empty:
            return {"monthlyExpenditure": [0] * 12}

        # Parse tanggal
        data["Tanggal"] = pd.to_datetime(
            data["Tanggal"], dayfirst=True, errors="coerce")
        data = data.dropna(subset=["Tanggal"])
        data["Bulan"] = data["Tanggal"].dt.month

        # Gunakan TotalHarga sebagai nilai
        data["TotalHarga"] = pd.to_numeric(
            data["TotalHarga"], errors="coerce").fillna(0)

        # Jumlahkan per bulan (Jan–Des)
        monthly = (
            data.groupby("Bulan")["TotalHarga"]
            .sum()
            .reindex(range(1, 13), fill_value=0)
            .tolist()
        )

        return {"monthlyExpenditure": monthly}

    except Exception as e:
        print(f"[ERROR] Monthly Expenditure ({years}): {e}")
        return {"monthlyExpenditure": [0] * 12}


@app.get("/api/dashboard-metrics")
async def get_dashboard_metrics(years: str = "2025"):
    try:
        selected_years = parse_years_param(years)
        if not selected_years:
            selected_years = [2025]

        data = df[df["Tahun"].isin(selected_years)].copy()
        if data.empty:
            return {"error": "Tidak ada data"}

        totalRequests = int(data["Jumlah"].sum())
        outflowValue = float(data["TotalHarga"].sum())
        totalUniqueRequesters = int(data["UnitPemohon"].nunique())
        totalUniqueSKUs = int(data["NamaBrg"].nunique())

        def format_rupiah(value):
            if value >= 1_000_000_000:
                return f"Rp{value / 1_000_000_000:.1f}M"
            elif value >= 1_000_000:
                return f"Rp{value / 1_000_000:.1f}jt"
            else:
                return f"Rp{value:,.0f}".replace(",", ".")

        return {
            "metrics": {
                "totalRequests": {"value": totalRequests, "changeText": "", "isPositive": None},
                "outflowValue": {"value": (outflowValue), "changeText": "", "isPositive": None},
                "totalUniqueRequesters": {"value": totalUniqueRequesters, "changeText": "Total", "isPositive": None},
                "totalUniqueSKUs": {"value": totalUniqueSKUs, "changeText": "Total", "isPositive": None}
            }
        }
    except Exception as e:
        print(f"[ERROR] Dashboard Metrics ({years}): {e}")
        return {"error": "Internal Server Error"}


def safe_float(value):
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0

@app.get("/api/top-spending-units")
async def get_top_spending_units(years: str = "2025"):
    try:
        selected_years = parse_years_param(years)
        data = df[df["Tahun"].isin(selected_years)].copy()

        # Pastikan TotalHarga bersih dari NaN
        data["TotalHarga"] = pd.to_numeric(data["TotalHarga"], errors='coerce').fillna(0)

        if data.empty:
            return {"topSpendingUnits": []}

        top_units = (
            data.groupby("UnitPemohon")
            .agg(
                TotalPengeluaran=("TotalHarga", "sum"),
                TotalPermintaan=("Jumlah", "sum")
            )
            .reset_index()
            .nlargest(10, "TotalPengeluaran")
        )

        result = []
        for _, row in top_units.iterrows():
            # Ambil segmen dari dataset asli
            segmen_row = df[df["UnitPemohon"] == row["UnitPemohon"]]["segmen"]
            segmen = segmen_row.iloc[0] if not segmen_row.empty else "Tidak Diketahui"
            result.append({
                "UnitPemohon": row["UnitPemohon"],
                "TotalPengeluaran": safe_float(row["TotalPengeluaran"]),
                "TotalPermintaan": int(row["TotalPermintaan"]) if not pd.isna(row["TotalPermintaan"]) else 0,
                "Segmen": segmen
            })

        return {"topSpendingUnits": result}
    except Exception as e:
        print(f"[ERROR] Top Spending Units: {e}")
        import traceback
        traceback.print_exc()
        return {"topSpendingUnits": []}


@app.get("/api/category-demand-proportion")
async def get_category_demand_proportion(years: str = "2025"):
    """
    Mengembalikan total permintaan (jumlah unit) per kategori untuk satu atau beberapa tahun.
    Contoh:
      /api/category-demand-proportion?years=2024,2025
      /api/category-demand-proportion?years=all
    """
    try:
        selected_years = parse_years_param(years)
        if not selected_years:
            return {"labels": [], "data": []}

        data = df[df["Tahun"].isin(selected_years)].copy()
        if data.empty:
            return {"labels": [], "data": []}

        # Kelompokkan berdasarkan Kategori, jumlahkan kolom 'Jumlah' (unit)
        category_agg = (
            data.groupby("Kategori")["Jumlah"]
            .sum()
            .nlargest(6)  # Ambil 6 kategori teratas
            .reset_index()
        )

        return {
            "labels": category_agg["Kategori"].tolist(),
            # pastikan integer
            "data": [int(x) for x in category_agg["Jumlah"].tolist()]
        }

    except Exception as e:
        print(f"[ERROR] Category Demand Proportion ({years}): {e}")
        import traceback
        traceback.print_exc()
        return {"labels": [], "data": []}
def generate_rule_based_answer(question: str, data: pd.DataFrame, year_label: str) -> str:
    """
    Memberikan jawaban langsung berdasarkan pola pertanyaan.
    Ini adalah fallback jika OpenRouter gagal.
    """
    lower_q = question.lower()

    # 1. Total Permintaan Unit
    if re.search(r"total.*permintaan.*unit|jumlah.*unit", lower_q):
        total = int(data["Jumlah"].sum())
        return f"Total permintaan unit {year_label} adalah {total:,} unit."

    # 2. Nilai Pengeluaran
    elif re.search(r"nilai.*pengeluaran|total.*nilai|total.*pengeluaran", lower_q):
        total_harga = float(data["TotalHarga"].sum())
        return f"Nilai pengeluaran barang {year_label} adalah {format_rupiah(total_harga)}."

    # 3. Barang Terlaris
    elif re.search(r"barang.*terlaris|paling.*sering.*diminta|barang.*paling.*banyak", lower_q):
        top_item = data.groupby("NamaBrg")["Jumlah"].sum().nlargest(1).reset_index()
        if len(top_item) > 0:
            nama_brg = top_item.iloc[0]["NamaBrg"]
            jumlah = int(top_item.iloc[0]["Jumlah"])
            return f"Barang yang paling sering diminta {year_label} adalah '{nama_brg}' dengan total {jumlah:,} unit."
        else:
            return f"Tidak ada data barang terlaris {year_label}."

    # 4. Unit Pemohon Terbanyak
    elif re.search(r"unit.*pemohon.*terbanyak|unit.*paling.*aktif|paling.*banyak.*mengajukan", lower_q):
        top_unit = data.groupby("UnitPemohon")["Jumlah"].sum().nlargest(1).reset_index()
        if len(top_unit) > 0:
            unit = top_unit.iloc[0]["UnitPemohon"]
            jumlah = int(top_unit.iloc[0]["Jumlah"])
            return f"Unit pemohon yang paling aktif {year_label} adalah '{unit}' dengan total {jumlah:,} unit."
        else:
            return f"Tidak ada data unit pemohon terbanyak {year_label}."

    # 5. Kategori dengan Nilai Tertinggi
    elif re.search(r"kategori.*nilai.*tertinggi|kategori.*terbesar", lower_q):
        top_cat = data.groupby("Kategori")["TotalHarga"].sum().nlargest(1).reset_index()
        if len(top_cat) > 0:
            kategori = top_cat.iloc[0]["Kategori"]
            nilai = float(top_cat.iloc[0]["TotalHarga"])
            return f"Kategori dengan nilai pengeluaran tertinggi {year_label} adalah '{kategori}' dengan nilai {format_rupiah(nilai)}."
        else:
            return f"Tidak ada data kategori dengan nilai tertinggi {year_label}."

    # 6. Tren Bulanan
    elif re.search(r"tren.*bulanan", lower_q):
        data["Tanggal"] = pd.to_datetime(data["Tanggal"], dayfirst=True, errors="coerce")
        data = data.dropna(subset=["Tanggal"])
        if data.empty:
            return f"Tidak ada data tanggal yang valid untuk tren bulanan {year_label}."
        data["Bulan"] = data["Tanggal"].dt.month
        monthly = data.groupby("Bulan")["Jumlah"].sum().reindex(range(1, 13), fill_value=0)
        trend = [int(x) for x in monthly.tolist()]
        return f"Tren pengeluaran bulanan {year_label}: {trend}"

    # Default: Tidak dikenali
    else:
        return (
            "Maaf, saya belum mengerti pertanyaan Anda.\n"
            "Silakan tanyakan tentang:\n"
            "• Total permintaan unit\n"
            "• Nilai pengeluaran\n"
            "• Barang terlaris\n"
            "• Unit pemohon paling aktif\n"
            "• Kategori dengan nilai tertinggi\n"
            "Contoh: \"Berapa total permintaan unit di tahun 2024?\""
        )

# ====================
# ✅ OpenRouter Config
# ====================

class ChatRequest(BaseModel):
    messages: List[dict]  # ✅ conversation history
class SuggestionsRequest(BaseModel):
    year: int = None

@app.post("/api/chatbot-ai")
async def chatbot_ai(request: ChatRequest, use_gemini: bool = True):  # tambahkan query param
    try:
        if not request.messages:
            return {"answer": "Tidak ada pesan."}

        last_user_message = request.messages[-1]["content"]
        print(f"[USER] {last_user_message}")

        # --- Ekstrak tahun & dapatkan data ---
        years_in_question = [int(m) for m in re.findall(r'\b(202[3-5])\b', last_user_message)]
        target_years = sorted(set(years_in_question)) if years_in_question else sorted(df["Tahun"].unique())
        data = df[df["Tahun"].isin(target_years)].copy()
        year_label = f"tahun {target_years[0]}" if len(target_years) == 1 \
            else f"Total Gabungan tahun {min(target_years)}–{max(target_years)}"

        if data.empty:
            return {"answer": f"Tidak ada data untuk {year_label}."}

        # --- Siapkan ringkasan data untuk konteks AI ---
        total_requests = int(data["Jumlah"].sum())
        total_expenditure = float(data["TotalHarga"].sum())
        top_item_row = data.groupby("NamaBrg")["Jumlah"].sum().nlargest(1)
        top_item = top_item_row.index[0] if not top_item_row.empty else "Tidak ada"
        top_unit_row = data.groupby("UnitPemohon")["Jumlah"].sum().nlargest(1)
        top_unit = top_unit_row.index[0] if not top_unit_row.empty else "Tidak ada"
        transaction_count = len(data)

        data_summary = {
            "total_requests": total_requests,
            "total_expenditure": total_expenditure,
            "top_item": top_item,
            "top_unit": top_unit,
            "transaction_count": transaction_count
        }

        # --- Jika use_gemini=True → pakai Gemini ---
        if use_gemini:
            gemini_answer = generate_gemini_answer(last_user_message, data_summary, year_label)
            if gemini_answer:
                print("[✅ GEMINI] Berhasil")
                return {"answer": gemini_answer}
            else:
                print("[⚠️ GEMINI GAGAL] Fallback ke rule-based...")

        # --- Fallback ke rule-based (sudah ada di kode Anda) ---
        fallback_answer = generate_rule_based_answer(last_user_message, data, year_label)
        return {"answer": fallback_answer}

    except Exception as e:
        print(f"[CRITICAL ERROR] {e}")
        traceback.print_exc()
        return {"answer": "Maaf, sedang ada gangguan. Silakan coba lagi."}


@app.get("/api/chatbot-query")
async def chatbot_query(question: str):
    """
    Jawab pertanyaan berdasarkan data riil — dengan insight dari semua endpoint:
    - Segmen (Hemat/Boros, Rendah/Tinggi)
    - Perbandingan tahun
    - Efisiensi, frekuensi, keragaman
    - Saran visualisasi (grafik, radar, scatter)
    """
    try:
        # === 1. Ekstrak Tahun (fleksibel) ===
        years_in_question = [int(m) for m in re.findall(r'\b(202[3-5])\b', question)]
        target_years = sorted(set(years_in_question)) if years_in_question else sorted(df["Tahun"].unique())
        data = df[df["Tahun"].isin(target_years)].copy()
        year_label = (
            f"tahun {target_years[0]}" if len(target_years) == 1
            else f"Total Gabungan tahun {', '.join(map(str, target_years))}"
        )
        if len(target_years) == 2:
            if " dan " in question.lower() or "dan" in question.lower():
                year_label = f"Total Gabungan tahun {target_years[0]} dan {target_years[1]}"
        if len(target_years) > 2:
            year_label = f"Total Gabungan tahun {min(target_years)}–{max(target_years)}"

        if data.empty:
            return {"answer": f"Tidak ada data untuk {year_label}."}

        # === 2. Normalisasi & Deteksi Niat ===
        lower_q = question.lower().strip()

        # === 3. Fungsi Bantu: Hitung Insight Tambahan ===
        def get_change_info(curr_data, ref_year):
            ref_data = df[df["Tahun"] == ref_year]
            curr_exp = float(curr_data["TotalHarga"].sum())
            ref_exp = float(ref_data["TotalHarga"].sum()) if not ref_data.empty else 0
            if ref_exp == 0:
                return "", None
            change = (curr_exp - ref_exp) / ref_exp * 100
            sign = "↑" if change > 0 else "↓"
            return f"{sign} {abs(change):.1f}% vs {ref_year}", change > 0

        def get_unit_segment(unit_name: str) -> dict:
            seg_row = df[df["UnitPemohon"] == unit_name][["segmen", "label_segmen"]].drop_duplicates()
            if not seg_row.empty:
                return {
                    "segmen": seg_row.iloc[0]["segmen"],
                    "label_segmen": seg_row.iloc[0]["label_segmen"]
                }
            return {"segmen": "Tidak Diketahui", "label_segmen": "Tidak Diketahui"}

        def get_active_months_data(data_subset):
            """Return (bulan_aktif: int, monthly_avg: float, is_valid: bool)"""
            if "Tanggal" not in data_subset.columns:
                return 0, 0.0, False
            try:
                temp = data_subset.copy()
                temp["Tanggal"] = pd.to_datetime(temp["Tanggal"], dayfirst=True, errors="coerce")
                temp = temp.dropna(subset=["Tanggal"])
                if temp.empty:
                    return 0, 0.0, False
                bulan_aktif = len(temp["Tanggal"].dt.to_period("M").unique())
                total_qty = int(temp["Jumlah"].sum())
                monthly_avg = total_qty / bulan_aktif if bulan_aktif > 0 else 0
                return bulan_aktif, monthly_avg, True
            except Exception:
                return 0, 0.0, False

        # === 4. DETEKSI & JAWABAN CERDAS ===

        # 🔹 Rata-rata Permintaan per Bulan (BARU & UTAMA)
        if any(kw in lower_q for kw in [
            "rata-rata permintaan per bulan", "rata rata permintaan per bulan",
            "rata-rata per bulan", "rata rata per bulan",
            "rata-rata bulanan", "rata rata bulanan",
            "berapa rata-rata per bulan", "berapa rata rata per bulan"
        ]):
            bulan_aktif, monthly_avg, is_valid = get_active_months_data(data)
            total_qty = int(data["Jumlah"].sum())
            transaksi = len(data)

            if not is_valid:
                # fallback: asumsi 12 bulan penuh
                bulan_aktif = 12 if len(target_years) == 1 else 12 * len(target_years)
                monthly_avg = total_qty / bulan_aktif

            answer = (
                f"📊 *Rata-rata permintaan per bulan* {year_label}:\n"
                f"• Total permintaan: {total_qty:,} unit\n"
                f"• Bulan aktif: {bulan_aktif} bulan\n"
                f"• **Rata-rata: {monthly_avg:,.1f} unit/bulan**"
            )

            # Tambahkan insight jika memungkinkan
            if len(target_years) == 1:
                efisiensi = total_qty / transaksi if transaksi > 0 else 0
                answer += f"\n• Efisiensi: {efisiensi:.1f} unit/transaksi"

            answer += "\n\n💡 *Data ini cocok untuk baseline perencanaan stok atau evaluasi kinerja bulanan.*"
            return {"answer": answer}

        # 🔹 Unit Pemohon Teraktif — DIPERKUAT
        elif any(kw in lower_q for kw in [
            "unit pemohon terbanyak", "unit paling aktif", "siapa paling sering",
            "unit mana yang paling aktif", "unit pemohon mana yang paling aktif",
            "siapa yang paling aktif", "unit teraktif", "pemohon terbanyak"
        ]):
            top_unit = data.groupby("UnitPemohon")["Jumlah"].sum().nlargest(1)
            if top_unit.empty:
                return {"answer": f"Tidak ada data unit aktif {year_label}."}
            unit_name = top_unit.index[0]
            total_qty = int(top_unit.iloc[0])
            total_value = float(data[data["UnitPemohon"] == unit_name]["TotalHarga"].sum())

            seg_info = get_unit_segment(unit_name)
            unit_data = data[data["UnitPemohon"] == unit_name]
            transaksi = len(unit_data)
            efisiensi = total_qty / transaksi if transaksi > 0 else 0

            # Hitung rata-rata per bulan untuk unit ini
            _, unit_monthly_avg, _ = get_active_months_data(unit_data)

            answer = (
                f"Unit pemohon yang paling aktif {year_label} adalah **'{unit_name}'** "
                f"dengan {total_qty:,} unit ({format_rupiah(total_value)}).\n"
                f"• Segmen: {seg_info['segmen']} (uang), {seg_info['label_segmen']} (volume)\n"
                f"• Efisiensi: {efisiensi:.1f} unit/transaksi\n"
                f"• Rata-rata: {unit_monthly_avg:,.1f} unit/bulan"
            )

            # Insight tambahan
            if seg_info["segmen"] == "Boros" and efisiensi < 5:
                answer += "\n⚠️ *Catatan: Pola permintaan cenderung boros & tidak efisien — evaluasi ulang direkomendasikan.*"
            elif efisiensi > 10:
                answer += "\n✅ *Catatan: Sangat efisien — bisa jadi best practice.*"

            answer += f"\n\n💡 *Ingin lihat radar chart atau detail bulanan untuk '{unit_name}'?*"
            return {"answer": answer}

        # 🔹 Total Permintaan + Insight
        elif any(kw in lower_q for kw in ["total permintaan", "jumlah unit", "berapa banyak unit"]):
            total = int(data["Jumlah"].sum())
            details = []
            for y in target_years:
                y_data = df[df["Tahun"] == y]
                details.append(f"➤ Tahun {y}: {int(y_data['Jumlah'].sum()):,} unit")
            detail_str = "\n".join(details) if len(target_years) > 1 else ""

            change_text, is_positive = "", None
            if len(target_years) == 1:
                prev_year = target_years[0] - 1
                if prev_year in df["Tahun"].unique():
                    _, is_positive = get_change_info(data, prev_year)
                    change_text = f" ({'naik' if is_positive else 'turun'} vs {prev_year})"

            answer = f"Total permintaan unit {year_label} adalah {total:,} unit{change_text}."
            if detail_str:
                answer += f"\n\nDetail per tahun:\n{detail_str}"
            answer += "\n\n💡 *Data ini bisa divisualisasikan sebagai grafik batang per tahun atau tren bulanan.*"
            return {"answer": answer}

        # 🔹 Nilai Pengeluaran + Insight Segmen & Perubahan
        elif any(kw in lower_q for kw in ["nilai pengeluaran", "total pengeluaran", "berapa nilai", "biaya total"]):
            total = float(data["TotalHarga"].sum())
            details = []
            for y in target_years:
                y_data = df[df["Tahun"] == y]
                details.append(f"➤ Tahun {y}: {format_rupiah(float(y_data['TotalHarga'].sum()))}")
            detail_str = "\n".join(details) if len(target_years) > 1 else ""

            insight_lines = []
            if len(target_years) == 1:
                year = target_years[0]
                top_unit = data.groupby("UnitPemohon")["TotalHarga"].sum().nlargest(1)
                if not top_unit.empty:
                    unit_name = top_unit.index[0]
                    seg_info = get_unit_segment(unit_name)
                    insight_lines.append(
                        f"• Unit terbesar: '{unit_name}' ({seg_info['segmen']}, permintaan {seg_info['label_segmen']})"
                    )
                prev_year = year - 1
                if prev_year in df["Tahun"].unique():
                    change_txt, _ = get_change_info(data, prev_year)
                    if change_txt:
                        insight_lines.append(f"• Perubahan: {change_txt}")

            answer = f"Nilai pengeluaran barang {year_label} adalah {format_rupiah(total)}."
            if detail_str:
                answer += f"\n\nDetail per tahun:\n{detail_str}"
            if insight_lines:
                answer += "\n\n🔍 Insight:\n" + "\n".join(insight_lines)
            answer += "\n\n💡 *Data ini cocok untuk grafik kategori (pie/bar), tren bulanan, atau scatter plot unit vs pengeluaran.*"
            return {"answer": answer}

        # 🔹 Barang Terlaris + Siapa yang sering meminta?
        elif any(kw in lower_q for kw in ["barang terlaris", "paling sering diminta", "barang favorit"]):
            top_item = data.groupby("NamaBrg")["Jumlah"].sum().nlargest(1)
            if top_item.empty:
                return {"answer": f"Tidak ada data barang terlaris {year_label}."}
            item_name = top_item.index[0]
            total_qty = int(top_item.iloc[0])
            item_data = data[data["NamaBrg"] == item_name]
            top_requester = item_data.groupby("UnitPemohon")["Jumlah"].sum().nlargest(1)
            requester_name = top_requester.index[0] if not top_requester.empty else "Tidak diketahui"

            answer = (
                f"Barang yang paling sering diminta {year_label} adalah **'{item_name}'** "
                f"dengan total {total_qty:,} unit.\n"
                f"• Pemohon terbanyak: '{requester_name}'"
            )
            answer += f"\n\n💡 *Ingin lihat detail bulanan untuk '{item_name}'? Atau bandingkan dengan tahun lalu?*"
            return {"answer": answer}

        # 🔹 Kategori Terbesar + Proporsi
        elif any(kw in lower_q for kw in ["kategori terbesar", "kategori dengan nilai tertinggi"]):
            top_cat = data.groupby("Kategori")["TotalHarga"].sum().nlargest(1)
            if top_cat.empty:
                return {"answer": f"Tidak ada data kategori {year_label}."}
            cat_name = top_cat.index[0]
            cat_value = float(top_cat.iloc[0])
            total_all = float(data["TotalHarga"].sum())
            prop = cat_value / total_all * 100 if total_all > 0 else 0

            answer = (
                f"Kategori dengan pengeluaran tertinggi {year_label} adalah **'{cat_name}'** "
                f"dengan nilai {format_rupiah(cat_value)} ({prop:.1f}% dari total)."
            )

            top_cat_unit = data.groupby("Kategori")["Jumlah"].sum().nlargest(1)
            if not top_cat_unit.empty and top_cat_unit.index[0] != cat_name:
                answer += f"\n• Tapi kategori dengan *volume tertinggi* adalah '{top_cat_unit.index[0]}'."

            answer += "\n\n💡 *Bisa ditampilkan dalam diagram pie atau bar chart perbandingan nilai vs volume.*"
            return {"answer": answer}

        # 🔹 Tren Bulanan
        elif "tren bulanan" in lower_q or "grafik bulanan" in lower_q:
            data["Tanggal"] = pd.to_datetime(data["Tanggal"], dayfirst=True, errors="coerce")
            data = data.dropna(subset=["Tanggal"])
            data["Bulan"] = data["Tanggal"].dt.month
            monthly = data.groupby("Bulan")["Jumlah"].sum().reindex(range(1,13), fill_value=0)
            peak_month = monthly.idxmax()
            peak_value = int(monthly.max())

            bulan_nama = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
            series_str = ", ".join([f"{bulan_nama[i]}: {int(monthly[i+1])}" for i in range(12)])

            answer = (
                f"Tren permintaan bulanan {year_label}:\n{series_str}\n"
                f"• Puncak: {bulan_nama[peak_month-1]} ({peak_value:,} unit)"
            )
            answer += "\n\n💡 *Data ini siap untuk ditampilkan dalam line chart atau heat map bulanan.*"
            return {"answer": answer}

        # 🔹 Efisiensi / Frekuensi (dipertahankan, tapi di-refactor)
        elif any(kw in lower_q for kw in ["efisiensi", "berapa kali", "frekuensi", "rata-rata per transaksi"]):
            transaksi = len(data)
            total_qty = int(data["Jumlah"].sum())
            efisiensi = total_qty / transaksi if transaksi > 0 else 0

            answer = (
                f"📊 *Metrik Operasional* {year_label}:\n"
                f"• Jumlah transaksi: {transaksi:,}\n"
                f"• Total permintaan: {total_qty:,} unit\n"
                f"• Efisiensi rata-rata: {efisiensi:.1f} unit/transaksi"
            )

            bulan_aktif, monthly_avg, _ = get_active_months_data(data)
            if bulan_aktif > 0:
                answer += f"\n• Frekuensi: {monthly_avg:.1f} unit/bulan"

            answer += "\n\n💡 *Metrik ini bisa dipakai untuk segmentasi unit atau evaluasi vendor.*"
            return {"answer": answer}

        # 🔹 Saran Visualisasi Umum
        elif any(kw in lower_q for kw in ["visualisasi", "grafik", "tampilkan", "chart", "diagram"]):
            answer = (
                "Berikut visualisasi yang tersedia berdasarkan data Anda:\n\n"
                "📈 **Tren Bulanan** — permintaan/unit/bulan\n"
                "📊 **Kategori** — nilai pengeluaran per kategori (bar/pie)\n"
                "🔍 **Top 5 Barang & Unit** — ranking berdasarkan volume/nilai\n"
                "🎯 **Radar Chart** — profil unit: anggaran, volume, efisiensi, frekuensi, dll\n"
                "📍 **Scatter Plot** — persebaran unit berdasarkan total permintaan vs pengeluaran\n"
                "🧮 **Detail Barang per Unit** — matriks bulanan\n\n"
                "Contoh: _\"Tampilkan radar untuk unit XYZ\"_ atau _\"Buatkan grafik kategori tahun 2024\"_"
            )
            return {"answer": answer}

        # === DEFAULT ===
        return {
            "answer": (
                "Maaf, saya belum mengerti pertanyaan Anda.\n"
                "Coba tanyakan seperti:\n"
                "• Total permintaan unit 2023 dan 2024?\n"
                "• Siapa unit paling aktif tahun 2025?\n"
                "• Berapa rata-rata permintaan per bulan?\n"
                "• Tampilkan tren bulanan 2024–2025?\n"
                "• Visualisasi apa yang tersedia?\n"
                "\nSaya bisa bantu analisis, bandingkan, atau sarankan insight!"
            )
        }

    except Exception as e:
        print(f"[ERROR] ChatBot Query Enhanced: {e}")
        import traceback
        traceback.print_exc()
        return {"answer": "Maaf, terjadi kesalahan. Silakan coba dengan kalimat yang lebih sederhana."}