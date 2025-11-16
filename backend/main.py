from fastapi import FastAPI, Query
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import unquote
from typing import List, Optional

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
        # Ambil SEMUA tahun unik dari dataset
        return sorted(df["Tahun"].dropna().unique().astype(int).tolist())

    try:
        return sorted(set(int(y.strip()) for y in years_param.split(",") if y.strip().isdigit()))
    except:
        return [2025]


def safe_float(value):
    """Convert value to float, handling NaN and Inf"""
    if pd.isna(value):
        return 0.0
    f = float(value)
    if not (f == f):  # Check for NaN (NaN != NaN)
        return 0.0
    if f == float('inf'):
        return 0.0
    if f == float('-inf'):
        return 0.0
    return f
# =====================================================
# ✅ Endpoint 1: Ringkasan Keseluruhan Semua Data
# =====================================================


@app.get("/api/data")
async def get_all_data():
    """
    Mengambil ringkasan seluruh data tanpa filter.
    """
    data = df.copy()

    totalRequests = int(data["Jumlah"].sum())
    outflowValue = float(data["TotalHarga"].sum())
    outflowValueFormatted = f"Rp{outflowValue:,.0f}".replace(",", ".")
    totalUniqueRequesters = int(data["UnitPemohon"].nunique())

    # Top 5 barang berdasarkan jumlah permintaan
    top_items_agg = (
        data.groupby(["Kategori", "NamaBrg"])
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
            "NamaBrg": row["NamaBrg"],
            "TopRequester": row["TopRequester"],
            "Terjual": int(row["TotalPermintaan"])
        })

    fastMovingItems = top_items[0]["NamaBrg"] if top_items else "Tidak ada"

    return {
        "totalRequests": totalRequests,
        "outflowValueFormatted": outflowValueFormatted,
        "totalUniqueRequesters": totalUniqueRequesters,
        "fastMovingItems": fastMovingItems,
        "topItems": top_items,
        "totalData": len(data)
    }

# =====================================================
# ✅ Endpoint 2: Ringkasan & Top 5 Barang per Tahun
# =====================================================


@app.get("/api/data-per-tahun")
async def get_data_per_tahun():
    """
    Mengembalikan ringkasan data dan top 5 barang berdasarkan tiap tahun.
    """
    hasil = {}
    tahun_list = sorted(df["Tahun"].unique())

    for tahun in tahun_list:
        data_tahun = df[df["Tahun"] == tahun]

        totalRequests = int(data_tahun["Jumlah"].sum())
        outflowValue = float(data_tahun["TotalHarga"].sum())
        outflowValueFormatted = f"Rp{outflowValue:,.0f}".replace(",", ".")
        totalUniqueRequesters = int(data_tahun["UnitPemohon"].nunique())

        # Top 5 barang per tahun
        top_items_agg = (
            data_tahun.groupby(["Kategori", "NamaBrg"])
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
                "NamaBrg": row["NamaBrg"],
                "TopRequester": row["TopRequester"],
                "Terjual": int(row["TotalPermintaan"])
            })

        fastMovingItems = top_items[0]["NamaBrg"] if top_items else "Tidak ada"

        hasil[tahun] = {
            "totalRequests": totalRequests,
            "outflowValueFormatted": outflowValueFormatted,
            "totalUniqueRequesters": totalUniqueRequesters,
            "fastMovingItems": fastMovingItems,
            "topItems": top_items
        }

    return hasil

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
            label_segmen=("label_segmen", "first")
        )
        .reset_index()
        .nlargest(5, "TotalPermintaan")
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
async def get_all_items(year: int):
    try:
        data = df[df["Tahun"] == year].copy()
        if data.empty:
            return {"items": []}

        # Agregasi per Nama Barang & Kategori
        item_agg = (
            data.groupby(["Kategori", "NamaBrg"])
            .agg(
                TotalPermintaan=("Jumlah", "sum"),
                TotalHarga=("TotalHarga", "sum")  # tambahan
            )
            .reset_index()
        )

        # Hitung HargaSatuan rata-rata
        item_agg["HargaSatuan"] = item_agg["TotalHarga"] / \
            item_agg["TotalPermintaan"]
        item_agg["HargaSatuan"] = item_agg["HargaSatuan"].fillna(0).round(2)

        # Urutkan berdasarkan TotalPermintaan
        item_agg = item_agg.sort_values("TotalPermintaan", ascending=False)

        items = []
        for _, row in item_agg.iterrows():
            items.append({
                "Kategori": row["Kategori"],
                "NamaBrg": row["NamaBrg"],
                "TotalPermintaan": int(row["TotalPermintaan"]),
                "HargaSatuan": float(row["HargaSatuan"])
            })

        return {"items": items}

    except Exception as e:
        print(f"[ERROR] All Items: {e}")
        import traceback
        traceback.print_exc()
        return {"items": []}


@app.get("/api/item-detail/{year}/{item_name}")
async def get_item_detail_by_name(year: int, item_name: str):
    try:
        if year not in [2023, 2024, 2025]:
            return {"units": []}

        decoded_item = unquote(item_name)

        # Filter data berdasarkan tahun dan nama barang
        filtered = df[
            (df["Tahun"] == year) &
            (df["NamaBrg"] == decoded_item)
        ]

        if filtered.empty:
            return {"units": []}

        # Group by UnitPemohon → jumlahkan Jumlah dan TotalHarga
        unit_agg = (
            filtered.groupby("UnitPemohon")
            .agg(
                Jumlah=("Jumlah", "sum"),
                # ✅ LANGSUNG dari kolom TotalHarga
                TotalPengeluaran=("TotalHarga", "sum")
            )
            .reset_index()
            .sort_values("Jumlah", ascending=False)
        )

        units = []
        for _, row in unit_agg.iterrows():
            units.append({
                "UnitPemohon": row["UnitPemohon"],
                "Jumlah": int(row["Jumlah"]),
                # ✅ Nilai sebenarnya
                "TotalPengeluaran": float(row["TotalPengeluaran"])
            })

        return {"units": units}

    except Exception as e:
        print(f"[ERROR] Item Detail for '{item_name}' in {year}: {e}")
        import traceback
        traceback.print_exc()
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


@app.get("/api/chatbot-query")
async def chatbot_query(question: str):
    """
    Jawab pertanyaan berdasarkan data riil.
    Deteksi tahun otomatis dari kalimat.
    Jika tidak ada tahun, gunakan semua data.
    """
    try:
        # Ekstrak tahun dari kalimat
        years_in_question = []
        for word in question.split():
            if word.isdigit() and len(word) == 4:
                year = int(word)
                if 2023 <= year <= 2025:  # Sesuaikan rentang tahun
                    years_in_question.append(year)

        # Tentukan tahun yang digunakan
        if len(years_in_question) > 0:
            target_year = years_in_question[0]  # Ambil tahun pertama
            data = df[df["Tahun"] == target_year].copy()
            year_label = f"tahun {target_year}"
        else:
            data = df.copy()
            year_label = "semua tahun (2023–2025)"

        if data.empty:
            return {"answer": f"Tidak ada data untuk {year_label}."}

        # Logika sederhana berdasarkan pertanyaan
        lower_q = question.lower()

        # 1. Total Permintaan Unit
        if "total permintaan unit" in lower_q or "jumlah unit" in lower_q:
            total = int(data["Jumlah"].sum())
            return {"answer": f"Total permintaan unit {year_label} adalah {total:,} unit."}

        # 2. Nilai Pengeluaran
        elif "nilai pengeluaran" in lower_q or "total nilai" in lower_q:
            total_harga = float(data["TotalHarga"].sum())
            return {"answer": f"Nilai pengeluaran barang {year_label} adalah {format_rupiah(total_harga)}."}

        # 3. Barang Terlaris
        elif "barang terlaris" in lower_q or "paling sering diminta" in lower_q:
            top_item = (
                data.groupby("NamaBrg")["Jumlah"]
                .sum()
                .nlargest(1)
                .reset_index()
            )
            if len(top_item) > 0:
                nama_brg = top_item.iloc[0]["NamaBrg"]
                jumlah = int(top_item.iloc[0]["Jumlah"])
                return {"answer": f"Barang yang paling sering diminta {year_label} adalah '{nama_brg}' dengan total {jumlah:,} barang."}
            else:
                return {"answer": f"Tidak ada data barang terlaris {year_label}."}

        # 4. Unit Pemohon Terbanyak
        elif "unit pemohon" in lower_q and ("terbanyak" in lower_q or "paling banyak" in lower_q):
            top_unit = (
                data.groupby("UnitPemohon")["Jumlah"]
                .sum()
                .nlargest(1)
                .reset_index()
            )
            if len(top_unit) > 0:
                unit = top_unit.iloc[0]["UnitPemohon"]
                jumlah = int(top_unit.iloc[0]["Jumlah"])
                return {"answer": f"Unit pemohon yang paling aktif {year_label} adalah '{unit}' dengan total {jumlah:,} unit."}
            else:
                return {"answer": f"Tidak ada data unit pemohon terbanyak {year_label}."}

        # 5. Kategori dengan Nilai Tertinggi
        elif "kategori dengan nilai tertinggi" in lower_q:
            top_cat = (
                data.groupby("Kategori")["TotalHarga"]
                .sum()
                .nlargest(1)
                .reset_index()
            )
            if len(top_cat) > 0:
                kategori = top_cat.iloc[0]["Kategori"]
                nilai = float(top_cat.iloc[0]["TotalHarga"])
                return {"answer": f"Kategori dengan nilai pengeluaran tertinggi {year_label} adalah '{kategori}' dengan nilai {format_rupiah(nilai)}."}
            else:
                return {"answer": f"Tidak ada data kategori dengan nilai tertinggi {year_label}."}

        # 6. Tren Bulanan (Januari - Desember)
        elif "tren bulanan" in lower_q:
            data["Tanggal"] = pd.to_datetime(
                data["Tanggal"], dayfirst=True, errors="coerce")
            data = data.dropna(subset=["Tanggal"])
            data["Bulan"] = data["Tanggal"].dt.month
            monthly = data.groupby("Bulan")["Jumlah"].sum().reindex(
                range(1, 13), fill_value=0)
            trend = [int(x) for x in monthly.tolist()]
            return {"answer": f"Tren pengeluaran bulanan {year_label}: {trend}"}

        # Default: tidak dikenali
        return {
            "answer": (
                "Maaf, saya belum mengerti pertanyaan Anda.\n"
                "Silakan tanyakan tentang:\n"
                "• Total permintaan unit\n"
                "• Nilai pengeluaran\n"
                "• Barang terlaris\n"
                "• Unit pemohon paling aktif\n"
                "• Kategori dengan nilai tertinggi\n"
                "Contoh: \"Berapa total permintaan unit di tahun 2024?\""
            )
        }

    except Exception as e:
        print(f"[ERROR] ChatBot Query: {e}")
        return {"answer": "Maaf, terjadi kesalahan saat memproses pertanyaan Anda."}


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
                "TotalPermintaan": int(row["TotalPermintaan"]) if not pd.isna(row["TotalPermintaan"]) else 0,
                "TotalPengeluaran": total_pengeluaran,
                "Segmen": segmen
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


@app.get("/api/top-spending-units")
async def get_top_spending_units(years: str = "2025"):
    try:
        selected_years = parse_years_param(years)
        data = df[df["Tahun"].isin(selected_years)].copy()
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
