import os
import json
import hashlib
from flask import Flask, request, jsonify, send_from_directory, abort
from werkzeug.exceptions import Unauthorized, Forbidden, BadRequest

# == CONFIG ==
TOKEN_DIR = os.path.join(os.path.dirname(__file__), "tokens")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
BASE_URL = "https://your.server.com/data/"  # Must match hosting domain

# Create directories if they don't exist
os.makedirs(TOKEN_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

app = Flask(__name__)

# === Always send CORS headers (required) ===
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'HEAD, POST, GET, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Pragma'
    return response

# === Handle OPTIONS (CORS preflight) ===
@app.route('/', methods=['OPTIONS'])
def handle_options():
    return '', 200

# === Handle POST /generate (saves incoming text) ===
@app.route('/generate', methods=['POST'])
def handle_generate():
    auth_header = request.headers.get('Authorization', '')
    token_match = None

    if auth_header.startswith('Bearer '):
        token_match = auth_header[7:]

    if not token_match or not validate_token(token_match):
        raise Unauthorized("Missing or invalid token (auth = {})".format(auth_header))

    data = request.get_json()

    course = data.get('course', '')
    learner = data.get('learner', '')
    interaction = data.get('interaction', '')
    content = data.get('content', '')
    question = data.get('question', '')
    key = data.get('key', '')

    if not course or not learner or not interaction or not content:
        raise BadRequest("Missing fields")

    # Hash the input and create a unique filename
    hash_input = f"{course}|{learner}|{interaction}|{key}"
    hash_value = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()[:32]
    filename = os.path.join(DATA_DIR, f"{hash_value}.html")

    html = f"<!DOCTYPE html><html><head><meta charset='UTF-8'>"
    html += "<style>body{font-family:sans-serif;}header{font-style:italic}</style>"
    html += "</head><body><header>" + wrap(question) + "</header>"
    html += "<main>" + wrap(content) + "</main></body></html>"

    # Save to file
    with open(filename, 'w') as f:
        f.write(html)

    return jsonify({"url": BASE_URL + f"{hash_value}.html"})

# === Handle POST /view (looks up text) ===
@app.route('/view', methods=['POST'])
def handle_view():
    auth_header = request.headers.get('Authorization', '')
    token_match = None

    if auth_header.startswith('Bearer '):
        token_match = auth_header[7:]

    if not token_match or not validate_token(token_match):
        raise Unauthorized("Missing or invalid token (auth = {})".format(auth_header))

    data = request.get_json()

    course = data.get('course', '')
    learner = data.get('learner', '')
    interaction = data.get('interaction', '')
    key = data.get('key', '')

    if not course or not learner or not interaction:
        raise BadRequest("Missing fields")

    hash_input = f"{course}|{learner}|{interaction}|{key}"
    hash_value = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()[:32]
    filename = os.path.join(DATA_DIR, f"{hash_value}.html")

    if os.path.exists(filename):
        return send_from_directory(DATA_DIR, f"{hash_value}.html")

    return '', 404

# === wrap and sanitise line breaks into HTML ===
def wrap(lines, tag="p"):
    html = ""
    for paragraph in lines.split("\n"):
        html += f"<{tag}>{paragraph.strip()}</{tag}>"
    return html

# === Validate token + origin ===
def validate_token(token):
    token_file = os.path.join(TOKEN_DIR, f"{token}.json")
    if not os.path.exists(token_file):
        return False

    with open(token_file, 'r') as f:
        info = json.load(f)

    allowed_domains = info.get('allowed_domains', [])
    origin = request.headers.get('Origin', '') or request.headers.get('Referer', '')
    host = origin.split('//')[-1].split('/')[0]

    return host in allowed_domains

# === Run the application ===
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
