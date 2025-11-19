from fastapi import FastAPI
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import unquote
from typing import List, Optional
import httpx
from fastapi import FastAPI, Query
from pydantic import BaseModel

app = FastAPI()

# --- CONFIGURASI OPENROUTER ---
OPENROUTER_API_KEY = "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"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
class ChatRequest(BaseModel):
    question: str
# --- DATA DUMMY (GANTI DENGAN FUNGSI NYATA ANDA) ---
# Contoh: ambil dari df atau database
def get_dashboard_data(year="2025"):
    """Ambil data aktual dari df"""
    # Filter data berdasarkan tahun
    data = df[df["Tahun"] == int(year)].copy()
    if data.empty:
        return {
            "total_requests": 0,
            "total_expenditure": 0,
            "top_units": [],
            "top_items": [],
            "categories": {}
        }

    total_requests = int(data["Jumlah"].sum())
    total_expenditure = float(data["TotalHarga"].sum())

    # Top 3 Unit Pemohon
    top_units = (
        data.groupby("UnitPemohon")
        .agg(TotalPengeluaran=("TotalHarga", "sum"))
        .reset_index()
        .nlargest(3, "TotalPengeluaran")
        .to_dict("records")
    )

    # Top 3 Barang
    top_items = (
        data.groupby("NamaBrg")
        .agg(Jumlah=("Jumlah", "sum"))
        .reset_index()
        .nlargest(3, "Jumlah")
        .to_dict("records")
    )

    # Kategori
    categories = (
        data.groupby("Kategori")
        .agg(TotalHarga=("TotalHarga", "sum"))
        .reset_index()
        .set_index("Kategori")["TotalHarga"]
        .to_dict()
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
    
# =====================================================
# ✅ Endpoint BARU: ChatBot Query via POST + OpenRouter AI
# =====================================================

import json

@app.post("/api/chatbot-ai")
async def chatbot_query_post(request: ChatRequest):
    """
    ✅ ENDPOINT POST untuk chatbot dengan dukungan OpenRouter AI
    - Jika pertanyaan terkait data → cari jawaban dari database
    - Jika pertanyaan umum lainnya → gunakan AI OpenRouter
    """
    try:
        question = request.question.strip()
        if not question:
            return {"answer": "Pertanyaan tidak boleh kosong."}
        
        # Handle sapaan
        if ("halo" in question.lower() or "hi" in question.lower() or "hai" in question.lower() or "hallo" in question.lower() 
            or "hello" in question.lower() or "selamat pagi" in question.lower() or "selamat siang" in question.lower()
            or "selamat sore" in question.lower() or "selamat malam" in question.lower() or "pagi" in question.lower()
            or "siang" in question.lower() or "sore" in question.lower() or "malam" in question.lower() or "hey" in question.lower() 
            or "yo" in question.lower() or "hiya" in question.lower() or "greetings" in question.lower() or "what's up" in question.lower()
            or "wassup" in question.lower() or "sup" in question.lower() or "hey there" in question.lower() or "good morning" in question.lower()
            or "good afternoon" in question.lower() or "good evening" in question.lower() or "good night" in question.lower()
            or "salut" in question.lower() or "shalom" in question.lower()):
            return {"answer": "Halo! 👋 Saya Asisten Analitik Permintaan. Siap membantu Anda dengan data permintaan, tren, atau barang terlaris. Silakan tanyakan!"}
        elif "assalamualaikum" in question.lower():
            return {"answer": "Waalaikumsalam! 👋 Saya Asisten Analitik Permintaan. Siap membantu Anda dengan data permintaan, tren, atau barang terlaris. Silakan tanyakan!"}

        # ===== STEP 1: Ekstrak tahun dari kalimat =====
        years_in_question = []
        for word in question.split():
            if word.isdigit() and len(word) == 4:
                year = int(word)
                if 2020 <= year <= 2030:
                    years_in_question.append(year)

        # Tentukan tahun yang digunakan
        if len(years_in_question) > 0:
            target_year = years_in_question[0]
            data = df[df["Tahun"] == target_year].copy()
            year_label = f"tahun {target_year}"
        else:
            data = df.copy()
            year_label = "semua tahun"

        # ===== STEP 2: Coba jawab dari database terlebih dahulu =====
        lower_q = question.lower()
        db_answer = try_answer_from_database(question, data, year_label, lower_q)
        if db_answer:
            return {"answer": db_answer}

        # ===== STEP 3: Jika tidak cocok dengan database, gunakan AI =====
        print(f"[INFO] Menggunakan OpenRouter AI untuk pertanyaan: {question}")
        ai_answer = await get_answer_from_openrouter(question, df)
        
        if ai_answer:
            return {"answer": ai_answer}
        else:
            return {"answer": "Maaf, saya tidak bisa menjawab pertanyaan ini."}

    except Exception as e:
        print(f"[ERROR] ChatBot Query POST: {e}")
        import traceback
        traceback.print_exc()
        return {"answer": f"Mohon maaf pertanyaan Anda tidak jelas 🙏, tolong tanyakan seputar sistem, data permintaan, tren, atau barang terlaris. Contoh: 'Apa itu STARK?'' atau 'Berapa total permintaan unit di tahun 2024?'"}


def handle_greeting(question):
    lower_q = question.lower()
    if ("halo" in lower_q or "hi" in lower_q or "hai" in lower_q or "hallo" in lower_q
        or "hello" in lower_q or "selamat pagi" in lower_q or "selamat siang" in lower_q
        or "selamat sore" in lower_q or "selamat malam" in lower_q or "pagi" in lower_q
        or "siang" in lower_q or "sore" in lower_q or "malam" in lower_q or "hey" in lower_q
        or "yo" in lower_q or "hiya" in lower_q or "greetings" in lower_q or "what's up" in lower_q
        or "wassup" in lower_q or "sup" in lower_q or "hey there" in lower_q or "good morning" in lower_q
        or "good afternoon" in lower_q or "good evening" in lower_q or "good night" in lower_q
        or "salut" in lower_q or "shalom" in lower_q):
        return "Halo! 👋 Saya Asisten Analitik Permintaan. Siap membantu Anda dengan data permintaan, tren, atau barang terlaris. Silakan tanyakan!"
    elif "assalamualaikum" in lower_q:
        return "Waalaikumsalam! 👋 Saya Asisten Analitik Permintaan. Siap membantu Anda dengan data permintaan, tren, atau barang terlaris. Silakan tanyakan!"
    return None

def try_answer_from_database(question, data, year_label, lower_q):
    """
    Coba jawab pertanyaan dari database menggunakan pattern matching
    Return: string (jawaban) atau None (jika tidak cocok)
    """
    # ===== PERTANYAAN TENTANG SISTEM STARK & ABOUT ===== ✅ BARU
    
    # 1. Apa itu STARK?
    if any(keyword in lower_q for keyword in ["apa itu stark", "stark itu apa", "pengertian stark", "definisi stark", "tentang stark"]):
        return (
            "📘 STARK (Strategic Tools for ATK Reporting & Control)\n\n"
            "STARK adalah dashboard analitik berbasis data yang dirancang untuk mendukung "
            "pengelolaan Permintaan dan Pengeluaran Barang di Politeknik Elektronika Negeri Surabaya (PENS).\n\n"
            "Sistem ini menyediakan informasi kebutuhan ATK dan menganalisis tren permintaan "
            "untuk mendukung pengambilan keputusan berbasis data."
        )
    
    # 2. Apa itu ATK?
    elif any(keyword in lower_q for keyword in ["apa itu atk", "atk itu apa", "pengertian atk", "kepanjangan atk"]):
        return (
            "📝 ATK (Alat Tulis Kantor)\n\n"
            "ATK adalah singkatan dari Alat Tulis Kantor, yaitu berbagai jenis barang/perlengkapan "
            "yang digunakan untuk keperluan administrasi dan operasional di kantor atau institusi.\n\n"
            "Contoh: pulpen, kertas, tinta printer, stapler, map, dan perlengkapan kantor lainnya.\n\n"
            "Di sistem STARK, kami mengelola permintaan dan pengeluaran ATK untuk seluruh unit di PENS."
        )
    
    # 3. Fitur apa saja di STARK?
    elif any(keyword in lower_q for keyword in ["fitur stark","fitur", "fitur sistem", "kemampuan stark", "bisa apa", "fungsi stark"]):
        return (
            "✨ Fitur Utama STARK:\n\n"
            "1. 📊 Dashboard Komprehensif - Visualisasi data permintaan & pengeluaran\n"
            "2. 🔍 Analisis Multi-Dimensi - Analisis berdasarkan unit, kategori, dan waktu\n"
            "3. 🤖 ChatBot AI - Asisten virtual untuk insights data interaktif\n"
            "4. 📋 Tabel Data Terperinci - Detail lengkap setiap transaksi\n"
            "5. 📅 Perbandingan Temporal - Bandingkan data antar tahun\n"
            "6. 📈 15+ Visualisasi - Berbagai jenis chart untuk analisis mendalam"
        )
    
    # 4. Cara menggunakan dashboard
    elif any(keyword in lower_q for keyword in ["cara menggunakan", "cara pakai", "panduan", "tutorial", "bagaimana menggunakan"]):
        return (
            "📖 Panduan Menggunakan STARK:\n\n"
            "1. Home - Lihat overview dan metrik kunci\n"
            "2. Analisis Unit - Analisis mendalam per unit pemohon\n"
            "3. Analisis Barang - Tren permintaan item\n"
            "4. ChatBot - Tanya AI untuk jawaban cepat\n"
            "5. About - Informasi lengkap sistem\n\n"
            "💡 Tips:\n"
            "- Hover pada grafik untuk detail\n"
            "- Pilih multiple tahun untuk perbandingan\n"
            "- Gunakan search untuk data spesifik\n"
            "- Tanya ChatBot untuk insights cepat"
        )
    
    # 5. Berapa halaman di STARK?
    elif any(keyword in lower_q for keyword in ["berapa halaman", "jumlah halaman", "halaman apa saja", "menu apa saja"]):
        return (
            "📄 Halaman di Sistem STARK:\n\n"
            "1. Home/Dashboard - Overview & metrik utama\n"
            "2. Analisis Unit - Analisis per unit pemohon\n"
            "3. Analisis Barang - Analisis per item\n"
            "4. ChatBot - Asisten AI interaktif\n"
            "5. About - Informasi & panduan sistem\n\n"
            "Total: 5 Halaman Utama dengan 15+ visualisasi data!"
        )
    
    # 6. Cara membaca visualisasi
    elif any(keyword in lower_q for keyword in ["cara membaca", "cara baca grafik", "membaca chart", "membaca visualisasi"]):
        return (
            "📊 Cara Membaca Visualisasi:\n\n"
            "1. Grafik Garis - Melihat tren naik/turun\n"
            "2. Grafik Lingkaran - Proporsi dari kategori\n"
            "3. Kartu Statistik - Metrik penting dalam angka besar\n"
            "4. Filter Tahun - Pilih tahun untuk perbandingan\n"
            "5. Tabel Data - Gunakan pencarian untuk data tertentu\n\n"
            "💡 Hover mouse pada grafik untuk melihat detail angka!"
        )
    
    # 7. Data tahun berapa saja?
    elif any(keyword in lower_q for keyword in ["tahun berapa", "data tahun", "tahun tersedia", "periode data"]):
        years_available = sorted(df["Tahun"].dropna().unique().astype(int).tolist())
        return (
            f"📅 Data Tersedia di STARK:\n\n"
            f"Sistem STARK mencakup data dari tahun: {', '.join(map(str, years_available))}\n\n"
            f"Anda dapat memilih satu atau beberapa tahun untuk analisis perbandingan."
        )
    
    # ===== PERTANYAAN TENTANG DATA ===== 
    
    if data.empty:
        return f"Tidak ada data untuk {year_label}."

    # 1. Total Permintaan Unit
    if any(keyword in lower_q for keyword in ["total permintaan", "jumlah unit", "berapa unit"]) and not any(neg in lower_q for neg in ["paling sedikit", "terendah", "minimum", "termurah"]):
        total = int(data["Jumlah"].sum())
        return f"Total permintaan unit {year_label} adalah {total:,} unit."

    # 2. Nilai Pengeluaran
    elif any(keyword in lower_q for keyword in ["nilai pengeluaran", "total pengeluaran", "total nilai", "berapa pengeluaran"]):
        total_harga = float(data["TotalHarga"].sum())
        formatted = format_rupiah(total_harga)
        return f"Nilai pengeluaran barang {year_label} adalah {formatted}."

    # 3. Barang Terlaris (TERBANYAK)
    elif any(keyword in lower_q for keyword in ["barang terlaris", "paling sering", "paling banyak diminta", "barang populer", "paling laku", "terbanyak diminta"]):
        top_item = (
            data.groupby("NamaBrg")["Jumlah"]
            .sum()
            .nlargest(1)
            .reset_index()
        )
        if len(top_item) > 0:
            nama_brg = top_item.iloc[0]["NamaBrg"]
            jumlah = int(top_item.iloc[0]["Jumlah"])
            return f"Barang yang paling sering diminta {year_label} adalah '{nama_brg}' dengan total {jumlah:,} unit."
        return None

    # ===== 3B. BARANG PALING JARANG / SEDIKIT DIMINTA ===== ✅ BARU
    elif any(keyword in lower_q for keyword in ["barang paling jarang", "paling sedikit diminta", "barang tidak laku", "jarang diminta", "paling sedikit"]):
        bottom_item = (
            data.groupby("NamaBrg")["Jumlah"]
            .sum()
            .nsmallest(1)
            .reset_index()
        )
        if len(bottom_item) > 0:
            nama_brg = bottom_item.iloc[0]["NamaBrg"]
            jumlah = int(bottom_item.iloc[0]["Jumlah"])
            return f"Barang yang paling jarang diminta {year_label} adalah '{nama_brg}' dengan total {jumlah:,} unit."
        return None

    # 4. Unit Pemohon TERBANYAK / PALING AKTIF
    elif any(keyword in lower_q for keyword in ["unit pemohon terbanyak", "paling aktif", "unit paling banyak", "pemohon terbanyak",
                                                "unit paling boros", "unit terbanyak"]) and not any(neg in lower_q for neg in ["tidak aktif", "paling sedikit", "terendah", "jarang", "hemat", "irit"]):
        top_unit = (
            data.groupby("UnitPemohon")["Jumlah"]
            .sum()
            .nlargest(1)
            .reset_index()
        )
        if len(top_unit) > 0:
            unit = top_unit.iloc[0]["UnitPemohon"]
            jumlah = int(top_unit.iloc[0]["Jumlah"])
            return f"Unit pemohon yang paling aktif {year_label} adalah '{unit}' dengan total {jumlah:,} unit."
        return None

    # ===== 4B. UNIT PEMOHON PALING TIDAK AKTIF / TERENDAH ===== ✅ BARU
    elif any(keyword in lower_q for keyword in ["unit paling tidak aktif", "unit terendah", "unit paling sedikit", "pemohon paling sedikit", "tidak aktif", "unit jarang", "unit paling jarang", 
                                                "pemohon terendah" ,"pemohon paling jarang", "pemohon tidak aktif", "unit pemohon terendah", "unit pemohon paling sedikit", "unit paling hemat", 
                                                "pemohon paling hemat", "unit pemohon paling hemat", "unit pemohon tidak aktif", "pemohon paling irit", "unit pemohon paling irit", "pemohon irit"]):
        bottom_unit = (
            data.groupby("UnitPemohon")["Jumlah"]
            .sum()
            .nsmallest(1)
            .reset_index()
        )
        if len(bottom_unit) > 0:
            unit = bottom_unit.iloc[0]["UnitPemohon"]
            jumlah = int(bottom_unit.iloc[0]["Jumlah"])
            return f"Unit pemohon yang paling tidak aktif {year_label} adalah '{unit}' dengan total {jumlah:,} unit."
        return None

    # 5. Kategori dengan Nilai Tertinggi
    elif any(keyword in lower_q for keyword in ["kategori tertinggi", "kategori termahal", "kategori paling tinggi","kategori terbesar", "nilai tertinggi", "pengeluaran tertinggi", ]) and not any(neg in lower_q for neg in ["terendah", "terkecil", "termurah"]):
        top_cat = (
            data.groupby("Kategori")["TotalHarga"]
            .sum()
            .nlargest(1)
            .reset_index()
        )
        if len(top_cat) > 0:
            kategori = top_cat.iloc[0]["Kategori"]
            nilai = float(top_cat.iloc[0]["TotalHarga"])
            formatted = format_rupiah(nilai)
            return f"Kategori dengan pengeluaran tertinggi {year_label} adalah '{kategori}' dengan nilai {formatted}."
        return None

    # ===== 5B. KATEGORI DENGAN NILAI TERENDAH ===== ✅ BARU
    elif any(keyword in lower_q for keyword in ["kategori terendah","kategori paling rendah","kategori terkecil", "nilai terendah", "pengeluaran terendah", "kategori termurah"]):
        bottom_cat = (
            data.groupby("Kategori")["TotalHarga"]
            .sum()
            .nsmallest(1)
            .reset_index()
        )
        if len(bottom_cat) > 0:
            kategori = bottom_cat.iloc[0]["Kategori"]
            nilai = float(bottom_cat.iloc[0]["TotalHarga"])
            formatted = format_rupiah(nilai)
            return f"Kategori dengan pengeluaran terendah {year_label} adalah '{kategori}' dengan nilai {formatted}."
        return None

    # 6. Jumlah Unit Pemohon Unik
    elif any(keyword in lower_q for keyword in ["berapa unit pemohon", "total unit berbeda", "jumlah pemohon unik", "berapa banyak unit"]):
        unique_units = int(data["UnitPemohon"].nunique())
        return f"Ada {unique_units} unit pemohon yang berbeda {year_label}."

    # 7. Jumlah Jenis Barang
    elif any(keyword in lower_q for keyword in ["jenis barang", "macam barang", "berapa barang", "tipe barang", "berapa jenis"]):
        unique_items = int(data["NamaBrg"].nunique())
        return f"Ada {unique_items} jenis barang yang diminta {year_label}."

    # 8. Rata-rata Harga
    elif any(keyword in lower_q for keyword in ["rata-rata harga", "harga rata", "harga average", "harga rata-rata"]):
        if int(data["Jumlah"].sum()) > 0:
            avg_price = float(data["TotalHarga"].sum()) / int(data["Jumlah"].sum())
            formatted = format_rupiah(avg_price)
            return f"Rata-rata harga per unit {year_label} adalah {formatted}."
        return None

    # ===== 8B. BARANG TERMAHAL ===== ✅ BARU
    elif any(keyword in lower_q for keyword in ["barang termahal", "harga tertinggi", "paling mahal", "termahal"]):
        # Hitung harga per unit untuk setiap barang
        barang_harga = data.groupby("NamaBrg").agg(
            TotalHarga=("TotalHarga", "sum"),
            TotalJumlah=("Jumlah", "sum")
        ).reset_index()
        barang_harga["HargaSatuan"] = barang_harga["TotalHarga"] / barang_harga["TotalJumlah"]
        termahal = barang_harga.nlargest(1, "HargaSatuan")
        
        if len(termahal) > 0:
            nama = termahal.iloc[0]["NamaBrg"]
            harga = float(termahal.iloc[0]["HargaSatuan"])
            return f"Barang termahal {year_label} adalah '{nama}' dengan harga satuan {format_rupiah(harga)}."
        return None

    # ===== 8C. BARANG TERMURAH ===== ✅ BARU
    elif any(keyword in lower_q for keyword in ["barang termurah", "harga terendah", "paling murah", "termurah"]):
        # Hitung harga per unit untuk setiap barang
        barang_harga = data.groupby("NamaBrg").agg(
            TotalHarga=("TotalHarga", "sum"),
            TotalJumlah=("Jumlah", "sum")
        ).reset_index()
        barang_harga["HargaSatuan"] = barang_harga["TotalHarga"] / barang_harga["TotalJumlah"]
        termurah = barang_harga.nsmallest(1, "HargaSatuan")
        
        if len(termurah) > 0:
            nama = termurah.iloc[0]["NamaBrg"]
            harga = float(termurah.iloc[0]["HargaSatuan"])
            return f"Barang termurah {year_label} adalah '{nama}' dengan harga satuan {format_rupiah(harga)}."
        return None

    # ===== 9. TREN PERMINTAAN BULANAN (UNIT) =====
    elif any(keyword in lower_q for keyword in ["tren permintaan", "pola permintaan", "grafik permintaan", "permintaan bulanan"]):
        if "Tanggal" not in data.columns or data["Tanggal"].isna().all():
            return f"Data tanggal tidak tersedia untuk {year_label}."
        
        data["Tanggal"] = pd.to_datetime(data["Tanggal"], dayfirst=True, errors="coerce")
        data = data.dropna(subset=["Tanggal"])
        
        if data.empty:
            return f"Tidak ada data tanggal yang valid untuk {year_label}."
        
        data["Bulan"] = data["Tanggal"].dt.month
        monthly = data.groupby("Bulan")["Jumlah"].sum().reindex(range(1, 13), fill_value=0)
        
        bulan_nama = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Oct", "Nov", "Des"]
        trend_text = "\n".join([f"- {bulan_nama[i]}: {int(monthly.iloc[i]):,} unit" for i in range(12)])
        
        total_permintaan = int(monthly.sum())
        bulan_tertinggi = bulan_nama[monthly.idxmax() - 1]
        nilai_tertinggi = int(monthly.max())
        
        return (
            f"📊 Tren Permintaan Bulanan {year_label.capitalize()}:\n\n"
            f"{trend_text}\n\n"
            f"✅ Total: {total_permintaan:,} unit\n"
            f"🔝 Puncak: {bulan_tertinggi} ({nilai_tertinggi:,} unit)"
        )

    # ===== 10. TREN PENGELUARAN BULANAN (RUPIAH) =====
    elif any(keyword in lower_q for keyword in ["tren pengeluaran", "pola pengeluaran", "grafik pengeluaran", "pengeluaran bulanan"]):
        if "Tanggal" not in data.columns or data["Tanggal"].isna().all():
            return f"Data tanggal tidak tersedia untuk {year_label}."
        
        data["Tanggal"] = pd.to_datetime(data["Tanggal"], dayfirst=True, errors="coerce")
        data = data.dropna(subset=["Tanggal"])
        
        if data.empty:
            return f"Tidak ada data tanggal yang valid untuk {year_label}."
        
        data["Bulan"] = data["Tanggal"].dt.month
        monthly = data.groupby("Bulan")["TotalHarga"].sum().reindex(range(1, 13), fill_value=0)
        
        bulan_nama = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Oct", "Nov", "Des"]
        trend_text = "\n".join([f"- {bulan_nama[i]}: {format_rupiah(monthly.iloc[i])}" for i in range(12)])
        
        total_pengeluaran = float(monthly.sum())
        bulan_tertinggi = bulan_nama[monthly.idxmax() - 1]
        nilai_tertinggi = float(monthly.max())
        
        return (
            f"💰 Tren Pengeluaran Bulanan {year_label.capitalize()}:\n\n"
            f"{trend_text}\n\n"
            f"✅ Total: {format_rupiah(total_pengeluaran)}\n"
            f"🔝 Puncak: {bulan_tertinggi} ({format_rupiah(nilai_tertinggi)})"
        )

    # ===== 11. BULAN DENGAN PERMINTAAN TERTINGGI ===== ✅ BARU
    elif any(keyword in lower_q for keyword in ["bulan tertinggi", "bulan terbanyak", "bulan puncak", "peak month"]):
        if "Tanggal" not in data.columns or data["Tanggal"].isna().all():
            return f"Data tanggal tidak tersedia untuk {year_label}."
        
        data["Tanggal"] = pd.to_datetime(data["Tanggal"], dayfirst=True, errors="coerce")
        data = data.dropna(subset=["Tanggal"])
        data["Bulan"] = data["Tanggal"].dt.month
        
        monthly = data.groupby("Bulan")["Jumlah"].sum()
        bulan_nama = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", 
                      "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
        
        bulan_max = monthly.idxmax()
        nilai_max = int(monthly.max())
        
        return f"Bulan dengan permintaan tertinggi {year_label} adalah {bulan_nama[bulan_max - 1]} dengan {nilai_max:,} unit."

    # ===== 12. BULAN DENGAN PERMINTAAN TERENDAH ===== ✅ BARU
    elif any(keyword in lower_q for keyword in ["bulan terendah", "bulan tersedikit", "bulan sepi", "lowest month"]):
        if "Tanggal" not in data.columns or data["Tanggal"].isna().all():
            return f"Data tanggal tidak tersedia untuk {year_label}."
        
        data["Tanggal"] = pd.to_datetime(data["Tanggal"], dayfirst=True, errors="coerce")
        data = data.dropna(subset=["Tanggal"])
        data["Bulan"] = data["Tanggal"].dt.month
        
        monthly = data.groupby("Bulan")["Jumlah"].sum()
        bulan_nama = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", 
                      "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
        
        bulan_min = monthly.idxmin()
        nilai_min = int(monthly.min())
        
        return f"Bulan dengan permintaan terendah {year_label} adalah {bulan_nama[bulan_min - 1]} dengan {nilai_min:,} unit."

    # ===== 13. TOP 5 BARANG TERLARIS ===== ✅ BARU
    elif any(keyword in lower_q for keyword in ["top 5 barang", "5 barang terlaris", "lima barang", "daftar barang terlaris"]):
        top_items = (
            data.groupby("NamaBrg")["Jumlah"]
            .sum()
            .nlargest(5)
            .reset_index()
        )
        if len(top_items) > 0:
            result = f"📊 Top 5 Barang Terlaris {year_label.capitalize()}:\n\n"
            for i, row in top_items.iterrows():
                result += f"{i+1}. {row['NamaBrg']} - {int(row['Jumlah']):,} unit\n"
            return result
        return None

    # ===== 14. TOP 5 UNIT PEMOHON TERAKTIF ===== ✅ BARU
    elif any(keyword in lower_q for keyword in ["top 5 unit", "5 unit teraktif", "lima unit", "daftar unit"]):
        top_units = (
            data.groupby("UnitPemohon")["Jumlah"]
            .sum()
            .nlargest(5)
            .reset_index()
        )
        if len(top_units) > 0:
            result = f"📊 Top 5 Unit Pemohon Teraktif {year_label.capitalize()}:\n\n"
            for i, row in top_units.iterrows():
                result += f"{i+1}. {row['UnitPemohon']} - {int(row['Jumlah']):,} unit\n"
            return result
        return None

    # Tidak cocok dengan database pattern
    return None

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


import math
import pandas as pd

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
