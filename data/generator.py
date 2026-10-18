import json
import math
import os
import random
from datetime import datetime, timedelta
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error

# Set fixed random seed for 100% reproducible realistic data
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, "public", "data")
SQL_OUTPUT_DIR = os.path.join(BASE_DIR, "supabase")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(SQL_OUTPUT_DIR, exist_ok=True)

SUPPLY_TYPES = ["food", "fuel", "ammunition", "medicine", "spare_parts"]

# Baseline consumption per soldier per day
BASE_CONSUMPTION = {
    "food": 2.5,        # kg / rations per soldier/day
    "fuel": 4.0,        # liters per soldier/day (heating + patrol generators)
    "ammunition": 1.2,  # units/rounds equivalent per soldier/day
    "medicine": 0.35,   # packs/supplies per soldier/day
    "spare_parts": 0.45 # components per soldier/day
}

# 1. 3 Base Logistics Depots
DEPOTS = [
    {
        "id": "D01",
        "name": "Zojila Base Logistics Hub",
        "latitude": 34.285,
        "longitude": 75.312,
        "altitude_m": 2740,
        "capacity_tons": 5000,
        "status": "OPERATIONAL"
    },
    {
        "id": "D02",
        "name": "Shyok Forward Staging Depot",
        "latitude": 34.620,
        "longitude": 76.150,
        "altitude_m": 3120,
        "capacity_tons": 3500,
        "status": "OPERATIONAL"
    },
    {
        "id": "D03",
        "name": "Nubra Valley Central Store",
        "latitude": 34.885,
        "longitude": 77.210,
        "altitude_m": 3048,
        "capacity_tons": 4200,
        "status": "OPERATIONAL"
    }
]

# 2. 12 Forward Army Posts (P01 to P12)
POST_NAMES = [
    "Karakoram Ridge", "Siachen Vanguard", "Changla Outpost",
    "Daulat Sector", "Galwan Watch", "Rezang Bastion",
    "Spanggur Fortress", "Kaksar Horizon", "Dras Heights",
    "Batalik Redoubt", "Chorbat Sentinel", "Sub-Sector Haneef"
]

posts = []
base_lat = 34.35
base_lon = 75.80

for i in range(1, 13):
    pid = f"P{i:02d}"
    name = POST_NAMES[i - 1]
    lat = round(base_lat + random.uniform(-0.6, 0.9), 4)
    lon = round(base_lon + random.uniform(-0.8, 1.4), 4)
    alt = random.randint(3400, 5600) # High altitude mountain posts
    soldiers = random.randint(35, 160)
    
    # Generate realistic current stock (typically 15 to 45 days reserve)
    current_stock = {}
    for supply in SUPPLY_TYPES:
        daily_base = soldiers * BASE_CONSUMPTION[supply]
        days_of_stock = random.uniform(14, 45)
        current_stock[supply] = round(daily_base * days_of_stock, 1)

    posts.append({
        "id": pid,
        "name": name,
        "latitude": lat,
        "longitude": lon,
        "altitude_m": alt,
        "soldiers": soldiers,
        "current_stock": current_stock
    })

# 3. 25-Point Road Network & 3 Mountain Passes
# Passes that close in winter heavy snow
PASSES = [
    {
        "id": "PASS-01",
        "name": "Khardung La Pass",
        "altitude_m": 5359,
        "risk_level": "EXTREME",
        "snow_closure_months": [11, 12, 1, 2, 3]
    },
    {
        "id": "PASS-02",
        "name": "Chang La Pass",
        "altitude_m": 5360,
        "risk_level": "HIGH",
        "snow_closure_months": [12, 1, 2, 3]
    },
    {
        "id": "PASS-03",
        "name": "Marsimik La Pass",
        "altitude_m": 5582,
        "risk_level": "CRITICAL",
        "snow_closure_months": [11, 12, 1, 2, 3, 4]
    }
]

# Build 25 node locations: 3 depots + 12 posts + 3 passes + 7 transit checkpoints
nodes = []
for d in DEPOTS:
    nodes.append({"id": d["id"], "name": d["name"], "type": "depot", "lat": d["latitude"], "lon": d["longitude"]})
for p in posts:
    nodes.append({"id": p["id"], "name": p["name"], "type": "post", "lat": p["latitude"], "lon": p["longitude"]})
for ps in PASSES:
    nodes.append({"id": ps["id"], "name": ps["name"], "type": "pass", "lat": round(base_lat + random.uniform(0.1, 0.5), 4), "lon": round(base_lon + random.uniform(0.1, 0.7), 4)})

checkpoints = [
    ("CP-ALPHA", "Sultan Chusku Junction", 34.42, 75.95),
    ("CP-BRAVO", "Tangtse Fork", 34.55, 76.45),
    ("CP-CHARLIE", "Chushul Crossing", 34.22, 76.70),
    ("CP-DELTA", "Murgo Transit Base", 34.78, 76.85),
    ("CP-ECHO", "Shyok Bridge Checkpost", 34.69, 76.32),
    ("CP-FOXTROT", "Sasoma Convoy Point", 34.92, 77.05),
    ("CP-GOLF", "Durbuk Convoy Staging", 34.39, 76.52)
]
for cid, cname, clat, clon in checkpoints:
    nodes.append({"id": cid, "name": cname, "type": "checkpoint", "lat": clat, "lon": clon})

# Build route segments with distance & terrain difficulty (1.0 = paved valley, 3.0 = treacherous steep moraine)
routes = []
node_ids = [n["id"] for n in nodes]

# Create connected network tree + mesh cross connections
def calc_dist(n1, n2):
    return round(math.hypot((n1["lat"] - n2["lat"]) * 111, (n1["lon"] - n2["lon"]) * 95), 1)

# Connect Depots to central Checkpoints
routes.append({"from": "D01", "to": "CP-ALPHA", "distance_km": 42.5, "difficulty": 1.4, "pass": None})
routes.append({"from": "D02", "to": "CP-ECHO", "distance_km": 31.0, "difficulty": 1.6, "pass": None})
routes.append({"from": "D03", "to": "CP-FOXTROT", "distance_km": 28.5, "difficulty": 1.8, "pass": None})

# Connect Checkpoints together
routes.append({"from": "CP-ALPHA", "to": "CP-BRAVO", "distance_km": 54.0, "difficulty": 2.1, "pass": "PASS-01"})
routes.append({"from": "CP-BRAVO", "to": "CP-GOLF", "distance_km": 22.0, "difficulty": 1.5, "pass": None})
routes.append({"from": "CP-GOLF", "to": "CP-CHARLIE", "distance_km": 61.0, "difficulty": 2.4, "pass": "PASS-02"})
routes.append({"from": "CP-BRAVO", "to": "CP-DELTA", "distance_km": 72.0, "difficulty": 2.9, "pass": "PASS-03"})
routes.append({"from": "CP-ECHO", "to": "CP-DELTA", "distance_km": 48.0, "difficulty": 2.2, "pass": None})
routes.append({"from": "CP-FOXTROT", "to": "CP-DELTA", "distance_km": 39.0, "difficulty": 2.5, "pass": None})

# Connect Posts to nearby Checkpoints or Passes
checkpoint_keys = ["CP-ALPHA", "CP-BRAVO", "CP-CHARLIE", "CP-DELTA", "CP-ECHO", "CP-FOXTROT", "CP-GOLF"]
for i, p in enumerate(posts):
    cp = checkpoint_keys[i % len(checkpoint_keys)]
    p_node = next(n for n in nodes if n["id"] == p["id"])
    cp_node = next(n for n in nodes if n["id"] == cp)
    d = max(12.0, calc_dist(p_node, cp_node))
    diff = round(random.uniform(1.8, 3.2), 1)
    pass_id = "PASS-02" if i % 4 == 0 else ("PASS-01" if i % 5 == 0 else None)
    routes.append({
        "from": cp,
        "to": p["id"],
        "distance_km": d,
        "difficulty": diff,
        "pass": pass_id
    })

graph_data = {
    "total_nodes": len(nodes),
    "total_routes": len(routes),
    "passes": PASSES,
    "nodes": nodes,
    "routes": routes
}

# 4. Generate 2 Years of Daily Usage & Train Predictive Model
print("Generating 2 years of daily operational telemetry (730 days)...")
start_date = datetime(2024, 1, 1)
total_days = 730

# Feature extractor for day-of-year, seasonal cold, snow, and altitude
def get_daily_weather(day_of_year, altitude_m):
    # Sinusoidal seasonal temperature: coldest in Jan/Feb, warmest in July
    rad = (day_of_year - 200) * (2 * math.pi / 365.0)
    base_temp = 5 + 15 * math.cos(rad) # -10C to +20C
    # Lapse rate: -6.5C per 1000m altitude
    lapse = ((altitude_m - 3000) / 1000.0) * 6.5
    temp = round(base_temp - lapse, 1)
    
    # Snow intensity index 0.0 to 1.0 (peaks during deep winter below 0C)
    if temp < -2.0:
        snow = min(1.0, round(abs(temp + 2.0) / 18.0 + random.uniform(0.1, 0.35), 2))
    else:
        snow = 0.0
    return temp, snow

# We will collect training histories and train ML forecasts
history_records = {} # (post_id, supply) -> list of daily usage

for p in posts:
    alt = p["altitude_m"]
    soldiers = p["soldiers"]
    alt_factor = 1.0 + (alt - 3000) / 7000.0 # higher altitude increases strain
    
    for s in SUPPLY_TYPES:
        series = []
        base_unit = BASE_CONSUMPTION[s] * soldiers * alt_factor
        
        for d in range(total_days):
            current_dt = start_date + timedelta(days=d)
            doy = current_dt.timetuple().tm_yday
            temp, snow = get_daily_weather(doy, alt)
            
            usage = base_unit
            
            # Weather-specific demands
            if s == "fuel":
                # Heating & generator fuel multiplies drastically in sub-zero snow
                winter_heating = max(0.0, -temp * 0.06) + (snow * 0.4)
                usage *= (1.0 + winter_heating)
            elif s == "food":
                # Caloric needs increase in freezing conditions
                caloric_surge = max(0.0, -temp * 0.015)
                usage *= (1.0 + caloric_surge)
            elif s == "ammunition":
                # Routine patrol firing + weapon checks; occasional high drill/encounter
                usage *= random.uniform(0.75, 1.25)
            elif s == "spare_parts":
                # Freezing temperatures cause mechanical brittle failures
                if temp < -10:
                    usage *= (1.0 + abs(temp) * 0.03 + snow * 0.25)
            elif s == "medicine":
                # Frostbite, altitude sickness (HAPE/AMS), winter respiratory ailments
                usage *= (1.0 + max(0.0, -temp * 0.025) + (snow * 0.3))
                
            # Random surges (supply convoys delayed, emergency drills, or severe blizzards)
            if random.random() < 0.035:
                surge_mult = random.uniform(1.4, 2.3)
                usage *= surge_mult
                
            # Add natural daily variance
            usage *= random.uniform(0.92, 1.08)
            series.append({
                "date": current_dt.strftime("%Y-%m-%d"),
                "day_of_year": doy,
                "temp": temp,
                "snow": snow,
                "usage": round(max(1.0, usage), 1)
            })
            
        history_records[(p["id"], s)] = series

# 5. Train 14-Day Forecaster and Baseline Benchmark
print("Training GradientBoosting regression models and computing 14-day forecasts...")
forecasts = {}
model_errors = []
baseline_errors = []

for p in posts:
    pid = p["id"]
    forecasts[pid] = {}
    
    for s in SUPPLY_TYPES:
        series = history_records[(pid, s)]
        
        # Build tabular ML dataset using lag features
        # Features: [day_of_year, temp, snow, lag_1, lag_7, lag_14, rolling_mean_7]
        X = []
        y = []
        values = [r["usage"] for r in series]
        
        for idx in range(14, len(series)):
            doy = series[idx]["day_of_year"]
            temp = series[idx]["temp"]
            snow = series[idx]["snow"]
            lag_1 = values[idx - 1]
            lag_7 = values[idx - 7]
            lag_14 = values[idx - 14]
            roll_7 = float(np.mean(values[idx - 7:idx]))
            
            X.append([doy, temp, snow, lag_1, lag_7, lag_14, roll_7])
            y.append(values[idx])
            
        X = np.array(X)
        y = np.array(y)
        
        # Train / Validation split (last 60 days for benchmarking)
        train_idx = len(X) - 60
        X_train, y_train = X[:train_idx], y[:train_idx]
        X_val, y_val = X[train_idx:], y[train_idx:]
        
        model = GradientBoostingRegressor(n_estimators=60, max_depth=3, random_state=SEED)
        model.fit(X_train, y_train)
        
        # Evaluation vs Naive Baseline ("guess same as 7 days ago / last week")
        preds = model.predict(X_val)
        baseline_preds = X_val[:, 4] # lag_7 feature
        
        mae_model = mean_absolute_error(y_val, preds)
        mae_baseline = mean_absolute_error(y_val, baseline_preds)
        
        model_errors.append(mae_model)
        baseline_errors.append(mae_baseline)
        
        # Now forecast next 14 days
        # Fit on all available data
        model.fit(X, y)
        last_values = list(values)
        last_date = datetime.strptime(series[-1]["date"], "%Y-%m-%d")
        
        daily_forecasts = []
        residuals_std = float(np.std(y_train - model.predict(X_train)))
        
        for step in range(1, 15):
            f_date = last_date + timedelta(days=step)
            f_doy = f_date.timetuple().tm_yday
            f_temp, f_snow = get_daily_weather(f_doy, p["altitude_m"])
            
            f_features = np.array([[
                f_doy,
                f_temp,
                f_snow,
                last_values[-1],
                last_values[-7] if len(last_values) >= 7 else last_values[-1],
                last_values[-14] if len(last_values) >= 14 else last_values[-1],
                float(np.mean(last_values[-7:]))
            ]])
            
            expected = round(float(model.predict(f_features)[0]), 1)
            # Low (10th percentile confidence) and High (90th percentile)
            low = round(max(0.5, expected - 1.645 * residuals_std), 1)
            high = round(expected + 1.645 * residuals_std, 1)
            
            daily_forecasts.append({
                "day": step,
                "date": f_date.strftime("%Y-%m-%d"),
                "low": low,
                "expected": expected,
                "high": high
            })
            # Append expected to rolling buffer for recursive multi-step forecasting
            last_values.append(expected)
            
        forecasts[pid][s] = {
            "historical_last_30": values[-30:],
            "next_14_days": daily_forecasts
        }

# Overall metrics
avg_model_mae = round(float(np.mean(model_errors)), 2)
avg_baseline_mae = round(float(np.mean(baseline_errors)), 2)
improvement_percent = round(((avg_baseline_mae - avg_model_mae) / avg_baseline_mae) * 100.0, 1)

metrics_data = {
    "model_name": "GradientBoosting Seasonal Forecaster",
    "forecast_horizon_days": 14,
    "baseline_method": "Last-Week Seasonal Naive (7-Day Lag)",
    "evaluation_metric": "Mean Absolute Error (MAE)",
    "model_mae": avg_model_mae,
    "baseline_mae": avg_baseline_mae,
    "improvement_percentage": improvement_percent,
    "summary": f"The ML forecast outperforms the naive last-week baseline by {improvement_percent}% lower error."
}

# 6. Save JSON files to public/data/
with open(os.path.join(OUTPUT_DIR, "posts.json"), "w", encoding="utf-8") as f:
    json.dump(posts, f, indent=2)

with open(os.path.join(OUTPUT_DIR, "depots.json"), "w", encoding="utf-8") as f:
    json.dump(DEPOTS, f, indent=2)

with open(os.path.join(OUTPUT_DIR, "graph.json"), "w", encoding="utf-8") as f:
    json.dump(graph_data, f, indent=2)

with open(os.path.join(OUTPUT_DIR, "forecasts.json"), "w", encoding="utf-8") as f:
    json.dump(forecasts, f, indent=2)

with open(os.path.join(OUTPUT_DIR, "metrics.json"), "w", encoding="utf-8") as f:
    json.dump(metrics_data, f, indent=2)

print("Saved all 5 JSON files in public/data/")

# 7. Generate supabase/seed_stock.sql
sql_lines = [
    "-- =====================================================================",
    "-- SUPABASE SEED SCRIPT: SEED STOCK DATA (supabase/seed_stock.sql)",
    "-- Generated from public/data/posts.json",
    "-- =====================================================================",
    "",
    "-- Optional: clear previous demo stock entries before repopulating",
    "TRUNCATE TABLE public.stock;",
    "",
    "INSERT INTO public.stock (post_id, item, qty, updated_at) VALUES"
]

sql_values = []
for p in posts:
    pid = p["id"]
    for supply, qty in p["current_stock"].items():
        sql_values.append(f"  ('{pid}', '{supply}', {qty}, NOW())")

sql_lines.append(",\n".join(sql_values) + ";")
sql_lines.append("")
sql_lines.append(f"-- Total seed rows created: {len(sql_values)}")

with open(os.path.join(SQL_OUTPUT_DIR, "seed_stock.sql"), "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))

print(f"Generated supabase/seed_stock.sql with {len(sql_values)} rows.")
print(f"Setup complete! {metrics_data['summary']}")
