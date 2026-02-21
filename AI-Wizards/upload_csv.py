import redis
import pandas as pd

r = redis.Redis(
    host='YOUR_HOST',
    port=15180,
    username="default",
    password="YOUR_PASSWORD",
    decode_responses=True,
)

df = pd.read_csv("data.csv")

pipe = r.pipeline()

for _, row in df.iterrows():
    key = f"duty:{row['origin'].lower()}:{row['destination'].lower()}:{row['product'].lower()}"
    pipe.set(key, row['base_duty'])

pipe.execute()

print("✅ CSV uploaded")