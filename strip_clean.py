import os
import re
import tokenize
import io

def strip_python_comments(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        source = f.read()
    
    io_obj = io.StringIO(source)
    out = ""
    last_lineno = -1
    last_col = 0
    
    try:
        for token in tokenize.generate_tokens(io_obj.readline):
            token_type = token[0]
            token_string = token[1]
            start_line, start_col = token[2]
            end_line, end_col = token[3]
            
            if start_line > last_lineno:
                last_col = 0
            if start_col > last_col:
                out += " " * (start_col - last_col)
                
            if token_type == tokenize.COMMENT:
                pass 
            else:
                out += token_string
                
            last_lineno = end_line
            last_col = end_col
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(out)
    except Exception as e:
        print(f"Error stripping {filepath}: {e}")

def strip_js_css_comments(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
        
    pattern = r'(".*?"|\'.*?\'|`[\s\S]*?`)|(/\*[\s\S]*?\*/|//.*)'
    def replacer(match):
        if match.group(2) is not None:
            return "" 
        return match.group(1) 
        
    new_text = re.sub(pattern, replacer, text)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_text)

def strip_html_comments(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    
    
    
    new_text = re.sub(r'<!--[\s\S]*?-->', '', text)
    
    
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_text)

def main():
    root_dir = "."
    for dirpath, dirnames, filenames in os.walk(root_dir):
        
        dirnames[:] = [d for d in dirnames if d not in ('.git', 'node_modules', 'env', 'venv', '.env')]
        
        for name in filenames:
            filepath = os.path.join(dirpath, name)
            if name.endswith('.py') and name != 'strip_clean.py':
                strip_python_comments(filepath)
                print(f"Cleaned {filepath}")
            elif name.endswith('.js') or name.endswith('.css'):
                strip_js_css_comments(filepath)
                print(f"Cleaned {filepath}")
            elif name.endswith('.html'):
                strip_html_comments(filepath)
                print(f"Cleaned {filepath}")

if __name__ == '__main__':
    main()
