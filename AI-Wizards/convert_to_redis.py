import re
import json

def escape_redis_string(s):
    # Escape double quotes and backslashes for Redis command line
    s = s.replace('\\', '\\\\').replace('\"', '\\\"').replace('\n', ' ')
    return s

def main():
    input_file = 'geopolitical_trade_rules_restrictions.txt'
    output_file = 'redis_rules.redis'
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by SECTIONS / SUBSECTIONS
    # A section header looks like "SECTION 1.1: TITLE" or "SUBSECTION 1.1.1: TITLE"
    pattern = r'(?:SECTION|SUBSECTION)\s+([\d\.]+):\s+([^\n]+)'
    
    # Find all matches
    matches = list(re.finditer(pattern, content))
    
    redis_commands = []
    
    for i, match in enumerate(matches):
        section_number = match.group(1).strip()
        title = match.group(2).strip()
        
        # Get the text between this match and the next one (or end of file)
        start_idx = match.end()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else len(content)
        
        section_text = content[start_idx:end_idx].strip()
        
        # Remove any stray "-------" or "=======" lines from the text
        section_text = re.sub(r'=+|-+', '', section_text).strip()
        
        # Escape for Redis
        title_esc = escape_redis_string(title)
        text_esc = escape_redis_string(section_text)
        
        key = f"trade_rule:{section_number}"
        
        # Format as a single HSET command
        cmd = f'HSET "{key}" "title" "{title_esc}" "content" "{text_esc}"'
        redis_commands.append(cmd)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for cmd in redis_commands:
            f.write(cmd + '\n')
            
    print(f'Successfully converted {len(redis_commands)} rules to {output_file}.')

if __name__ == '__main__':
    main()
