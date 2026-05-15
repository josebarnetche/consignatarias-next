#!/usr/bin/env python3
"""
Extract monthly IGMAG and category data from MAGYP PDF.
Uses the data we can see in the December 2024 report which contains 2022-2024 history.
"""

import json
from pathlib import Path

# Data extracted from MAGYP December 2024 PDF (Page 3 - Precios corrientes)
# Format: IGMAG, Novillos, Novillitos, Vacas, Vaquillonas, Toros, MEJ

monthly_data = {
    "2022": {
        "01": [205.896, 219.765, 235.023, 170.746, 229.11, 187.546, 218.565],
        "02": [225.019, 251.656, 266.953, 182.534, 256.821, 221.086, 254.762],
        "03": [235.247, 270.437, 283.568, 188.47, 275.118, 229.031, 247.245],
        "04": [239.879, 283.261, 305.829, 194.192, 297.605, 229.076, 274.867],
        "05": [233.652, 284.544, 315.252, 182.491, 305.035, 214.622, 266.99],
        "06": [231.203, 275.647, 310.546, 176.171, 301.395, 202.424, 272.863],
        "07": [237.468, 274.778, 305.24, 189.703, 290.215, 215.036, 275.593],
        "08": [272.447, 292.454, 317.372, 235.736, 301.428, 273.452, 303.39],
        "09": [270.335, 287.820, 311.922, 232.631, 295.553, 258.418, 295.516],
        "10": [251.561, 277.191, 295.175, 198.847, 282.128, 210.674, 281.889],
        "11": [255.453, 275.700, 299.004, 203.215, 284.151, 232.207, 278.266],
        "12": [265.828, 288.685, 306.217, 210.654, 292.113, 236.391, 274.113],
    },
    "2023": {
        "01": [298.561, 331.131, 346.980, 238.678, 333.867, 265.291, 317.814],
        "02": [380.452, 436.895, 462.083, 291.280, 446.483, 339.592, 427.964],
        "03": [352.733, 437.567, 474.249, 234.527, 453.887, 285.828, 397.449],
        "04": [335.005, 454.812, 488.174, 232.669, 466.559, 296.985, 409.590],
        "05": [335.509, 450.947, 489.875, 221.191, 464.048, 277.637, 448.203],
        "06": [342.098, 467.107, 484.319, 234.394, 461.524, 276.785, 423.005],
        "07": [399.628, 490.009, 506.85, 309.526, 482.600, 323.612, 461.333],
        "08": [613.139, 710.387, 743.647, 494.631, 715.595, 541.371, 644.393],
        "09": [637.071, 704.831, 732.579, 546.160, 695.195, 610.968, 673.439],
        "10": [779.709, 849.499, 877.394, 650.465, 846.590, 690.888, 828.176],
        "11": [870.733, 945.975, 981.166, 747.965, 942.694, 818.304, 902.866],
        "12": [1243.837, 1405.297, 1426.228, 982.868, 1367.523, 1044.683, 1288.769],
    },
    "2024": {
        "01": [1307.190, 1424.196, 1479.296, 1090.779, 1419.302, 1208.814, 1353.752],
        "02": [1440.579, 1689.308, 1738.244, 1094.739, 1658.983, 1247.800, 1536.095],
        "03": [1433.337, 1704.034, 1835.255, 993.884, 1778.232, 1151.286, 1544.319],
        "04": [1413.169, 1763.050, 1955.368, 958.871, 1865.596, 1062.558, 1730.829],
        "05": [1332.770, 1777.352, 1983.422, 938.587, 1857.771, 1042.605, 1626.931],
        "06": [1412.047, 1826.803, 2007.697, 969.922, 1910.871, 1041.891, 1559.194],
        "07": [1583.874, 1937.645, 2067.811, 1166.261, 1921.293, 1203.338, 1726.597],
        "08": [1744.401, 1953.108, 2053.432, 1428.571, 1942.049, 1563.154, 1895.670],
        "09": [1740.934, 1871.695, 1995.079, 1474.652, 1896.724, 1576.785, 1879.167],
        "10": [1740.960, 1900.880, 1956.043, 1471.942, 1867.191, 1551.763, 1875.535],
        "11": [1872.780, 2012.505, 2130.930, 1564.695, 2020.975, 1679.755, 2034.286],
        "12": [2024.757, 2264.201, 2362.187, 1537.970, 2270.741, 1640.406, 2179.801],
    },
}

# Build output structures
categories = ["igmag", "novillos", "novillitos", "vacas", "vaquillonas", "toros", "mej"]

# market-monthly.json (IGMAG only)
monthly_series = []
for year in sorted(monthly_data.keys()):
    for month in sorted(monthly_data[year].keys()):
        values = monthly_data[year][month]
        monthly_series.append({
            "period": f"{year}-{month}",
            "value": round(values[0], 2)
        })

monthly_output = {
    "index": "igmag",
    "name": "Indice General Mercado Agroganadero",
    "unit": "$/kg vivo",
    "source": "magyp.gob.ar (Mercado Agroganadero S.A.)",
    "note": "Promedios mensuales. IGMAG reemplaza al anterior IGML.",
    "count": len(monthly_series),
    "range": {
        "from": monthly_series[0]["period"],
        "to": monthly_series[-1]["period"]
    },
    "series": monthly_series
}

# market-categories.json (all categories)
categories_series = []
for year in sorted(monthly_data.keys()):
    for month in sorted(monthly_data[year].keys()):
        values = monthly_data[year][month]
        categories_series.append({
            "period": f"{year}-{month}",
            "igmag": round(values[0], 2),
            "novillos": round(values[1], 2),
            "novillitos": round(values[2], 2),
            "vacas": round(values[3], 2),
            "vaquillonas": round(values[4], 2),
            "toros": round(values[5], 2),
            "mej": round(values[6], 2),
        })

categories_output = {
    "source": "magyp.gob.ar (Mercado Agroganadero S.A.)",
    "unit": "$/kg vivo",
    "note": "Precios promedios mensuales por categoria. MEJ = Mestizo/Especial/Joven.",
    "categories": ["igmag", "novillos", "novillitos", "vacas", "vaquillonas", "toros", "mej"],
    "count": len(categories_series),
    "range": {
        "from": categories_series[0]["period"],
        "to": categories_series[-1]["period"]
    },
    "series": categories_series
}

# Save files
output_dir = Path(__file__).parent.parent / "src" / "lib" / "data"
output_dir.mkdir(parents=True, exist_ok=True)

with open(output_dir / "market-monthly.json", "w", encoding="utf-8") as f:
    json.dump(monthly_output, f, indent=2, ensure_ascii=False)
    print(f"Saved: {output_dir / 'market-monthly.json'}")
    print(f"  - {len(monthly_series)} monthly data points")
    print(f"  - Range: {monthly_series[0]['period']} to {monthly_series[-1]['period']}")

with open(output_dir / "market-categories.json", "w", encoding="utf-8") as f:
    json.dump(categories_output, f, indent=2, ensure_ascii=False)
    print(f"Saved: {output_dir / 'market-categories.json'}")
    print(f"  - {len(categories_series)} monthly data points x 7 categories")

print("\nDone! 3 years of historical data extracted.")
