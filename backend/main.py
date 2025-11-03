from fastapi import FastAPI
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import unquote

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
# ====================
# ✅ Load & Clean Data
# ====================
csv_path = "D:\\SEMESTER 5\\WORKSHOP ANALITIKA DATA TERAPAN\\Dataset\\Data_SPC.csv"

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
df["Tahun"] = df["Tahun"].astype(int)

# Validasi kolom penting
required_cols = ["Jumlah", "TotalHarga", "UnitPemohon", "NamaBrg", "Kategori", "Tahun"]
for col in required_cols:
    if col not in df.columns:
        raise ValueError(f"Kolom '{col}' tidak ditemukan di data CSV!")

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
            TopRequester=("UnitPemohon", lambda x: x.mode().iloc[0] if not x.mode().empty else "N/A")
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
                TopRequester=("UnitPemohon", lambda x: x.mode().iloc[0] if not x.mode().empty else "N/A")
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
async def get_dashboard_metrics():
    try:
        all_years = sorted(df["Tahun"].dropna().unique())
        if len(all_years) < 1:
            return {"error": "Tidak ada data tahun yang valid."}

        current_year = int(max(all_years))
        previous_year = current_year - 1

        current_data = df[df["Tahun"] == current_year]
        previous_data = df[df["Tahun"] == previous_year]

        # Tahun ini
        total_requests_current = int(current_data["Jumlah"].sum()) if not current_data.empty else 0
        outflow_value_current = float(current_data["TotalHarga"].sum()) if not current_data.empty else 0.0
        unique_requesters_current = int(current_data["UnitPemohon"].nunique()) if not current_data.empty else 0
        unique_skus_current = int(current_data["NamaBrg"].nunique()) if not current_data.empty else 0

        # Tahun lalu
        total_requests_prev = int(previous_data["Jumlah"].sum()) if not previous_data.empty else 0
        outflow_value_prev = float(previous_data["TotalHarga"].sum()) if not previous_data.empty else 0.0
        unique_requesters_prev = int(previous_data["UnitPemohon"].nunique()) if not previous_data.empty else 0
        unique_skus_prev = int(previous_data["NamaBrg"].nunique()) if not previous_data.empty else 0

        # Helper
        def calc_change(curr, prev):
            return "N/A" if prev == 0 else round(((curr - prev) / prev) * 100, 1)

        def format_change(val):
            if val == "N/A":
                return "N/A"
            sign = "↑" if val > 0 else "↓"
            return f"{sign} {abs(val):.1f}% vs Tahun Lalu"

        # Format uang
        def format_rupiah(value):
            if value >= 1_000_000_000:
                return f"Rp{value / 1_000_000_000:.1f}M"
            elif value >= 1_000_000:
                return f"Rp{value / 1_000_000:.1f}jt"
            else:
                return f"Rp{value:,.0f}".replace(",", ".")

        return {
            "current_year": current_year,
            "previous_year": previous_year,
            "metrics": {
                "totalRequests": {
                    "value": total_requests_current,
                    "changeText": format_change(calc_change(total_requests_current, total_requests_prev)),
                    "isPositive": calc_change(total_requests_current, total_requests_prev) > 0 if calc_change(total_requests_current, total_requests_prev) != "N/A" else None
                },
                "outflowValue": {
                    "value": format_rupiah(outflow_value_current),
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
        print(f"[ERROR] Dashboard Metrics: {e}")
        return {"error": "Internal Server Error", "detail": str(e)}


# =====================================================
# ✅ Endpoint 4: Data Bulanan per Tahun
# =====================================================
@app.get("/api/monthly-demand/{year}")
async def get_monthly_demand(year: int):
    try:
        data = df[df["Tahun"] == year].copy()
        if data.empty:
            return {"monthlyDemand": [0]*12}

        # Parse tanggal
        data["Tanggal"] = pd.to_datetime(data["Tanggal"], dayfirst=True, errors="coerce")
        data = data.dropna(subset=["Tanggal"])
        data["Bulan"] = data["Tanggal"].dt.month

        monthly = data.groupby("Bulan")["Jumlah"].sum().reindex(range(1, 13), fill_value=0)
        return {"monthlyDemand": [int(x) for x in monthly.tolist()]}
    except Exception as e:
        print(f"[ERROR] Monthly Demand: {e}")
        return {"monthlyDemand": [0]*12}
    
@app.get("/api/monthly-outcome/{year}")
async def get_monthly_outcome(year: int):
    try:
        # Salin data untuk menghindari efek samping
        temp_df = df.copy()

        # 1. Parse Tanggal dengan benar (format: DD/MM/YYYY)
        temp_df["Tanggal"] = pd.to_datetime(temp_df["Tanggal"], dayfirst=True, errors="coerce")
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
        full_year = monthly_sum.reindex(range(1, 13), fill_value=0).sort_index()

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
@app.get("/api/category-and-top-items/{year}")
async def get_category_and_top_items(year: int):
    try:
        print(f"\n[DEBUG] Mencari data untuk tahun: {year}")
        
        # Cek tipe dan nilai unik di kolom Tahun
        print(f"[DEBUG] Tipe kolom 'Tahun': {df['Tahun'].dtype}")
        print(f"[DEBUG] Nilai unik di 'Tahun': {sorted(df['Tahun'].dropna().unique())}")

        # Filter data
        data = df[df["Tahun"] == year].copy()
        print(f"[DEBUG] Jumlah baris setelah filter tahun {year}: {len(data)}")

        if data.empty:
            print("[DEBUG] ❌ Tidak ada data untuk tahun ini!")
            return {
                "categoryValueLabels": [],
                "categoryValueData": [],
                "topItems": []
            }

        # Cek apakah kolom 'Kategori' ada dan tidak kosong
        print(f"[DEBUG] Kolom 'Kategori' null: {data['Kategori'].isnull().sum()}")
        print(f"[DEBUG] Nilai unik 'Kategori': {data['Kategori'].dropna().unique()[:5]}")

        # Cek apakah 'TotalHarga' numerik
        print(f"[DEBUG] Tipe 'TotalHarga': {data['TotalHarga'].dtype}")
        print(f"[DEBUG] Sample 'TotalHarga': {data['TotalHarga'].head().tolist()}")

        # Agregasi kategori
        category_agg = (
            data.groupby("Kategori")["TotalHarga"]
            .sum()
            .nlargest(6)
            .reset_index()
        )
        print(f"[DEBUG] Hasil agregasi kategori:\n{category_agg}")

        # Top 5 barang
        top_items_agg = (
            data.groupby(["Kategori", "NamaBrg", "label_segmen"])
            .agg(
                TotalPermintaan=("Jumlah", "sum"),
                TopRequester=("UnitPemohon", lambda x: x.mode().iloc[0] if not x.mode().empty else "N/A")
            )
            .reset_index()
            .nlargest(5, "TotalPermintaan")
        )
        print(f"[DEBUG] Hasil top 5 barang:\n{top_items_agg.head()}")

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
        print(f"[ERROR] Category & Top Items: {e}")
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
        total_requests_current = int(current_data["Jumlah"].sum()) if not current_data.empty else 0
        outflow_value_current = float(current_data["TotalHarga"].sum()) if not current_data.empty else 0.0
        unique_requesters_current = int(current_data["UnitPemohon"].nunique()) if not current_data.empty else 0
        unique_skus_current = int(current_data["NamaBrg"].nunique()) if not current_data.empty else 0

        # Hitung metrik tahun lalu
        total_requests_prev = int(previous_data["Jumlah"].sum()) if not previous_data.empty else 0
        outflow_value_prev = float(previous_data["TotalHarga"].sum()) if not previous_data.empty else 0.0
        unique_requesters_prev = int(previous_data["UnitPemohon"].nunique()) if not previous_data.empty else 0
        unique_skus_prev = int(previous_data["NamaBrg"].nunique()) if not previous_data.empty else 0

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
                    "value": format_rupiah(outflow_value_current),
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
@app.get("/api/top-requesters/{year}")
async def get_top_requesters(year: int):
    try:
        data = df[df["Tahun"] == year].copy()
        if data.empty:
            return {"topRequesters": []}

        # Agregasi per Unit Pemohon (tetap perlu, karena satu unit punya banyak transaksi)
        agg = (
            data.groupby(["UnitPemohon"])
            .agg(
                TotalPermintaan=("Jumlah", "sum"),
                TotalPengeluaran=("TotalHarga", "sum"),
                # Ambil satu nilai representatif untuk Kategori dan label_segmen
                # Misal: ambil yang paling sering muncul (mode), atau yang pertama
                Kategori=("Kategori", lambda x: x.mode().iloc[0] if not x.mode().empty else x.iloc[0]),
                label_segmen=("label_segmen", lambda x: x.mode().iloc[0] if not x.mode().empty else x.iloc[0])
            )
            .reset_index()
        )

        if agg.empty:
            return {"topRequesters": []}

        # Ambil 5 sampel acak (atau kurang jika kurang dari 5)
        sample_size = min(5, len(agg))
        sampled = agg.sample(n=sample_size, random_state=None)  # random_state=None → benar-benar acak tiap kali

        top_requesters = []
        for _, row in sampled.iterrows():
            top_requesters.append({
                "Kategori": row["Kategori"],
                "UnitPemohon": row["UnitPemohon"],
                "TotalPermintaan": int(row["TotalPermintaan"]),
                "TotalPengeluaran": float(row["TotalPengeluaran"]),
                "KelasPermintaan": row["label_segmen"]
            })

        return {"topRequesters": top_requesters}

    except Exception as e:
        print(f"[ERROR] Top Requesters (Random Sample): {e}")
        return {"topRequesters": []}
    
# =====================================================
# ✅ Endpoint Baru: Kategori Berdasarkan Jumlah Unit (bukan nilai uang)
# =====================================================
@app.get("/api/category-units/{year}")
async def get_category_units(year: int):
    try:
        data = df[df["Tahun"] == year].copy()
        if data.empty:
            return {"labels": [], "data": []}

        # Agregasi Jumlah per Kategori, ambil top 6
        category_agg = (
            data.groupby("Kategori")["Jumlah"]
            .sum()
            .nlargest(6)
            .reset_index()
        )

        return {
            "labels": category_agg["Kategori"].tolist(),
            "data": [int(x) for x in category_agg["Jumlah"].tolist()]
        }

    except Exception as e:
        print(f"[ERROR] Category Units: {e}")
        return {"labels": [], "data": []}
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
            .nlargest(5)
            .reset_index()
        )

        return {
            "labels": category_agg["Kategori"].tolist(),
            "data": [float(x) for x in category_agg["TotalHarga"].tolist()]
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
            .nlargest(5)
            .reset_index()
        )

        return {
            "labels": category_agg["Kategori"].tolist(),
            "data": [int(x) for x in category_agg["Jumlah"].tolist()]
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
                TotalPermintaan=("Jumlah", "sum")
            )
            .reset_index()
            .sort_values("TotalPermintaan", ascending=False)
        )

        items = []
        for _, row in item_agg.iterrows():
            items.append({
                "Kategori": row["Kategori"],
                "NamaBrg": row["NamaBrg"],
                "TotalPermintaan": int(row["TotalPermintaan"]),
            })

        return {"items": items}

    except Exception as e:
        print(f"[ERROR] All Items: {e}")
        return {"items": []}

@app.get("/api/item-detail/{year}/{item_name}")
async def get_item_detail_by_name(year: int, item_name: str):
    try:
        if year not in [2023, 2024, 2025]:
            return {"units": []}

        # Decode URL-encoded item name
        decoded_item = unquote(item_name)

        # Filter data berdasarkan tahun dan nama barang
        filtered = df[
            (df["Tahun"] == year) & 
            (df["NamaBrg"] == decoded_item)
        ]

        if filtered.empty:
            return {"units": []}

        # Group by UnitPemohon
        unit_agg = (
            filtered.groupby("UnitPemohon")["Jumlah"]
            .sum()
            .reset_index()
            .sort_values("Jumlah", ascending=False)
        )

        units = []
        for _, row in unit_agg.iterrows():
            units.append({
                "UnitPemohon": row["UnitPemohon"],
                "Jumlah": int(row["Jumlah"])
            })

        return {"units": units}

    except Exception as e:
        print(f"[ERROR] Item Detail for '{item_name}' in {year}: {e}")
        return {"units": []}
@app.get("/api/monthly-demand/{year}")
async def get_monthly_demand(year: int):
    try:
        data = df[df["Tahun"] == year].copy()
        data["Tanggal"] = pd.to_datetime(data["Tanggal"], dayfirst=True, errors="coerce")
        data = data.dropna(subset=["Tanggal"])
        data["Bulan"] = data["Tanggal"].dt.month

        monthly = data.groupby("Bulan")["Jumlah"].sum().reindex(range(1, 13), fill_value=0)
        return {"monthlyDemand": monthly.tolist()}
    except Exception as e:
        print(f"[ERROR] Monthly Demand: {e}")
        return {"monthlyDemand": [0]*12}
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
                return {"answer": f"Barang yang paling sering diminta {year_label} adalah '{nama_brg}' dengan total {jumlah:,} unit."}
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
            data["Tanggal"] = pd.to_datetime(data["Tanggal"], dayfirst=True, errors="coerce")
            data = data.dropna(subset=["Tanggal"])
            data["Bulan"] = data["Tanggal"].dt.month
            monthly = data.groupby("Bulan")["Jumlah"].sum().reindex(range(1,13), fill_value=0)
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

        data["Tanggal"] = pd.to_datetime(data["Tanggal"], dayfirst=True, errors="coerce")
        data = data.dropna(subset=["Tanggal"])
        data["Bulan"] = data["Tanggal"].dt.month

        monthly_agg = data.groupby(["NamaBrg", "Bulan"])["Jumlah"].sum().reset_index()
        pivot = monthly_agg.pivot(index="NamaBrg", columns="Bulan", values="Jumlah").fillna(0)

        for bulan in range(1, 13):
            if bulan not in pivot.columns:
                pivot[bulan] = 0
        pivot = pivot.reindex(sorted(pivot.columns), axis=1)

        items = []
        for nama_brg in pivot.index:
            bulan_data = [int(pivot.loc[nama_brg, bulan]) for bulan in range(1, 13)]
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
@app.get("/api/unit-scatter-data")
async def get_unit_scatter_data():
    try:
        agg = df.groupby("UnitPemohon").agg(
            TotalPermintaan=("Jumlah", "sum"),
            TotalPengeluaran=("TotalHarga", "sum")
        ).reset_index()

        result = []
        for _, row in agg.iterrows():
            result.append({
                "UnitPemohon": row["UnitPemohon"],
                "TotalPermintaan": int(row["TotalPermintaan"]),
                "TotalPengeluaran": float(row["TotalPengeluaran"]),
            })
        return {"units": result}
    except Exception as e:
        print(f"[ERROR] Scatter Data: {e}")
        return {"units": []}


# === Endpoint: Data Radar per Unit ===
@app.get("/api/unit-radar-data")
async def get_unit_radar_data(unit: str):
    try:
        data = df[df["UnitPemohon"] == unit].copy()
        if data.empty:
            return {}

        total_permintaan = int(data["Jumlah"].sum())
        total_pengeluaran = float(data["TotalHarga"].sum())
        rata_harga = total_pengeluaran / total_permintaan if total_permintaan > 0 else 0
        keragaman_kategori = int(data["Kategori"].nunique())
        
        # Efisiensi: misal = total_permintaan / jumlah transaksi (semakin tinggi, semakin efisien)
        jumlah_transaksi = len(data)
        efisiensi = total_permintaan / jumlah_transaksi if jumlah_transaksi > 0 else 0

        # Ambil segmen dari /api/unit-pemohon-list (atau hitung ulang)
        # Untuk sederhana, kita ambil dari agregasi global
        all_units = df.groupby("UnitPemohon").agg(
            TotalPermintaan=("Jumlah", "sum"),
            TotalPengeluaran=("TotalHarga", "sum")
        )
        permintaan_vals = all_units["TotalPermintaan"]
        pengeluaran_vals = all_units["TotalPengeluaran"]
        p33, p66 = permintaan_vals.quantile(0.33), permintaan_vals.quantile(0.66)
        e33, e66 = pengeluaran_vals.quantile(0.33), pengeluaran_vals.quantile(0.66)

        # Segmen Keuangan
        if total_pengeluaran >= e66:
            segmen_keuangan = "Tinggi"
        elif total_pengeluaran >= e33:
            segmen_keuangan = "Sedang"
        else:
            segmen_keuangan = "Rendah"

        return {
            "TotalPengeluaran": total_pengeluaran,
            "TotalPermintaan": total_permintaan,
            "RataRataHargaBarang": rata_harga,
            "EfisiensiPembelian": efisiensi,
            "KeragamanKategori": keragaman_kategori,
            "SegmenKeuangan": segmen_keuangan
        }
    except Exception as e:
        print(f"[ERROR] Radar Data for {unit}: {e}")
        return {}