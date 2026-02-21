import redis
import re
import json

def normalize_text(text):
    """Normalize text by lowercasing, stripping spaces, and removing extra internal spaces."""
    if not text:
        return ""
    text = str(text).lower().strip()
    return re.sub(r'\s+', ' ', text)

def get_trade_compliance_info(origin: str, destination: str, product: str) -> str:
    """
    Retrieves the base duty rate and associated trade rules from the Redis database
    based on the exporting country, importing country, and product description.
    
    Args:
        origin (str): The exporting country (e.g., 'China', 'India').
        destination (str): The importing country (e.g., 'United States', 'European Union').
        product (str): The product description or category.
        
    Returns:
        str: A JSON string containing the duty rate and any rule matches found.
    """
    try:
        # Initialize Redis connection
        # 🔐 Ensure you use your secure credentials
        r = redis.Redis(
            host='redis-15180.c330.asia-south1-1.gce.cloud.redislabs.com',
            port=15180,
            username="default",
            password="E9giB2NnEvyqZxGx2oVTjV2z7f7YEZVx",
            decode_responses=True,
        )
        
        # Normalize the inputs to match our Redis keys
        norm_origin = normalize_text(origin)
        norm_dest = normalize_text(destination)
        norm_product = normalize_text(product)
        
        # 1. Fetch Duty Rate
        duty_key = f"duty:{norm_origin}:{norm_dest}:{norm_product}"
        duty_rate = r.get(duty_key)
        
        # If no strict exact match for duty, we could gracefully handle it:
        if duty_rate is None:
            duty_rate = "Not Found / Data Unavailable"
            
        # 2. Fetch Rules (e.g. general rules or specific matches)
        # Note: If you want to dynamically match rules based on keywords from the country or product,
        # you can iterate over keys or search. Here's an example fetching all rules to find relevant ones.
        # For a production system with many rules, RediSearch (FT.SEARCH) is highly recommended.
        
        # As a fallback for this tool, let's grab a few sample rules to demonstrate:
        relevant_rules = []
        rule_keys = r.keys("trade_rule:*")
        
        # Basic keyword matching (Optional depending on your needs)
        search_terms = [norm_origin, norm_dest, norm_product]
        for r_key in rule_keys:
            rule_data = r.hgetall(r_key)
            title = normalize_text(rule_data.get('title', ''))
            content = normalize_text(rule_data.get('content', ''))
            
            # Simple substring search in the rules
            for term in search_terms:
                if term and (term in title or term in content) and len(term) > 3:
                    relevant_rules.append({
                        "rule_id": r_key,
                        "title": rule_data.get('title'),
                        "matched_term": term
                    })
                    break # Matched this rule, move to next

        # Compile response
        result = {
            "query": {
                "origin": origin,
                "destination": destination,
                "product": product
            },
            "duty_rate": duty_rate,
            "relevant_rules_count": len(relevant_rules),
            "relevant_rules": relevant_rules[:5] # Limit to top 5 matches
        }
        
        return json.dumps(result, indent=2)

    except Exception as e:
        return json.dumps({"error": str(e)})

# ==== FOR TESTING PURPOSES ONLY ====
if __name__ == "__main__":
    test_result = get_trade_compliance_info("China", "United States", "Electronics")
    print(test_result)
