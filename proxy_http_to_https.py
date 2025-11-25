#!/usr/bin/env python3
"""
Simple HTTP to HTTPS proxy for local development
Accepts HTTP requests and forwards them to HTTPS backend
"""
from flask import Flask, request, Response
import requests
import urllib3

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)

# Target HTTPS endpoint
TARGET_HOST = "https://localhost:9050"

@app.route('/', defaults={'path': ''}, methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'])
@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'])
def proxy(path):
    """Proxy all requests to HTTPS backend"""
    # Build target URL
    target_url = f"{TARGET_HOST}/{path}"

    # Add query string if present
    if request.query_string:
        target_url += f"?{request.query_string.decode()}"

    # Forward headers (excluding Host)
    headers = dict(request.headers)
    headers.pop('Host', None)

    # Forward request
    try:
        resp = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=request.get_data(),
            params=request.args,
            allow_redirects=False,
            verify=False,  # Skip SSL verification for self-signed cert
            stream=True
        )

        # Create response
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in resp.headers.items()
                   if name.lower() not in excluded_headers]

        # Stream response
        def generate():
            for chunk in resp.iter_content(chunk_size=4096):
                yield chunk

        response = Response(generate(), resp.status_code, headers)
        return response

    except Exception as e:
        return f"Proxy error: {str(e)}", 502

if __name__ == '__main__':
    print("Starting HTTP to HTTPS proxy on port 9052...")
    print("Forwarding to: https://localhost:9050")
    app.run(host='0.0.0.0', port=9052, debug=False)