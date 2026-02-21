import redis
import pandas as pd
import shlex
import re

# 🔐 Replace with NEW credentials
r = redis.Redis(
    host='redis-15180.c330.asia-south1-1.gce.cloud.redislabs.com',
    port=15180,
    username="default",
    password="E9giB2NnEvyqZxGx2oVTjV2z7f7YEZVx",
    decode_responses=True,
)

def normalize_text(text):
    """Normalize text by lowercasing, stripping spaces, and removing extra internal spaces."""
    if pd.isna(text):
        return ""
    # Convert to string, lowercase, and strip
    text = str(text).lower().strip()
    # Replace multiple spaces with a single space
    return re.sub(r'\s+', ' ', text)

# -------------------------------
# PART 1: Upload CSV (DUTY DATA)
# -------------------------------
print("Uploading duty data...")

try:
    df = pd.read_csv("data.csv")
    
    # 3. Normalize column names: convert to lowercase, strip spaces
    df.columns = [col.lower().strip() for col in df.columns]
    
    # 4. Print detected column names for debugging
    print(f"Detected normalized column names in CSV: {list(df.columns)}")
    
    # 5. Use the first 4 columns as: origin, destination, product, base_duty
    col_origin = df.columns[4] # Exporting_Country
    col_dest = df.columns[5] # Importing_Country
    col_product = df.columns[2] # Category or Product_Description
    col_duty = df.columns[6] # Base_Duty_Rate (%)
    
    # Or just use positions indices 4, 5, 2, 6 as they correspond to Exporting_Country, Importing_Country, Category, Base_duty
    # Let's map dynamically based on standard indexing or explicit column mapping depending on CSV
    
    pipe = r.pipeline()
    count_duty = 0
    
    for _, row in df.iterrows():
        # First 4 logical conceptual fields based on prompt: origin, destination, product, base_duty
        # In our CSV: exporting_country, importing_country, product_description, base_duty_rate (%)
        try:
            # 6. Normalize values using the function
            origin = normalize_text(row.iloc[4] if len(row) > 4 else "") # Exporting_Country
            dest = normalize_text(row.iloc[5] if len(row) > 5 else "") # Importing_Country
            product = normalize_text(row.iloc[3] if len(row) > 3 else "") # Product_Description
            duty = str(row.iloc[6] if len(row) > 6 else "").strip() # Base_Duty_Rate
            
            if not origin or not dest or not product:
                continue

            # 7. Store duty data in Redis using key format -> duty:{origin}:{destination}:{product}
            key = f"duty:{origin}:{dest}:{product}"
            
            # 8. Use pipeline for bulk upload
            pipe.set(key, duty)
            count_duty += 1
            
        except Exception as e:
            print(f"⚠️ Error processing CSV row: {row}")
            print(e)

    pipe.execute()
    print(f"✅ Duty data uploaded: {count_duty} records")

except Exception as e:
    print("❌ Failed to process data.csv")
    print(e)


# -------------------------------
# PART 2: Execute redis_rules.redis
# -------------------------------
print("\nUploading rules from redis_rules.redis...")

count_rules = 0
try:
    with open("redis_rules.redis", "r", encoding="utf-8") as f:
        pipe_rules = r.pipeline()
        for line in f:
            line = line.strip()

            if not line or line.startswith("#"):
                continue

            try:
                # 9. Use shlex to correctly parse line with quoted strings containing spaces
                # Split command into parts honoring quotes
                parts = shlex.split(line)

                if not parts:
                    continue

                command = parts[0].upper()

                if command == "HSET":
                    key = parts[1]

                    # remaining are field-value pairs
                    field_values = parts[2:]

                    # convert into dict
                    mapping = {}
                    for i in range(0, len(field_values), 2):
                        if i + 1 < len(field_values):
                            field = field_values[i]
                            value = field_values[i + 1]
                            mapping[field] = value

                    if mapping:
                        pipe_rules.hset(key, mapping=mapping)
                        count_rules += 1

            except Exception as e:
                print(f"⚠️ Error processing line in redis_rules.redis. Line: {line[:50]}...")
                print(e)
                
        pipe_rules.execute()
    print(f"✅ Rules uploaded: {count_rules} rules")

except Exception as e:
    print("❌ Failed to process redis_rules.redis")
    print(e)


# -------------------------------
# TEST & VERIFY
# -------------------------------
print("\nTesting...")

# 10. After upload, print all Redis keys
try:
    keys = r.keys("*")
    print(f"\n🔑 Total Redis keys found: {len(keys)}")
    print(f"Sample keys: {keys[:10]}")
except Exception as e:
    print(f"⚠️ Could not fetch keys: {e}")

# Wait for a moment before fetching
import time
time.sleep(1)

# 11. Test with specific formats
print("\n--- Test Duty ---")
# Getting a known value from the CSV (e.g. Exporting_Country=China, Importing_Country=United States, Product=Portable automatic data processing machines weighing not more than 10 kg)
test_origin = normalize_text("China")
test_dest = normalize_text("United States")
test_product = normalize_text("Portable automatic data processing machines weighing not more than 10 kg")
test_duty_key = f"duty:{test_origin}:{test_dest}:{test_product}"
print(f"Testing duty key: {test_duty_key}")
print("Duty Result:", r.get(test_duty_key))

print("\n--- Test Rule ---")
test_rule_key = "trade_rule:1.1" # Using an actual rule key created by our script
print(f"Testing rule key: {test_rule_key}")
print("Rule Result:", r.hgetall(test_rule_key))

print("\n🚀 All data successfully uploaded!")