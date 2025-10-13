# Resources Centre API Specification

This document specifies the REST API endpoints that need to be implemented in the Resources Centre to enable automated data synchronization with Pivotal CRM.

## Authentication

All API endpoints should be protected with API key authentication:
- Header: `X-API-Key: <api_key>`
- The API key should be configurable in Resources Centre environment variables
- Return 401 Unauthorized if the API key is invalid or missing

## Endpoints

### 1. Get All Speakers

**Endpoint:** `GET /api/speakers`

**Headers:**
```
X-API-Key: <api_key>
```

**Response:** 200 OK
```json
{
  "speakers": [
    {
      "id": 1,
      "name": "Dr. Jane Smith",
      "title": "Chief Data Officer",
      "company": "TechCorp",
      "bio": "AI and data science expert with 15 years of experience...",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Field Specifications:**
- `id` (integer, required): Unique identifier
- `name` (string, required): Speaker's full name
- `title` (string, optional): Professional title
- `company` (string, optional): Company/organization
- `bio` (string, optional): Biography/description
- `created_at` (ISO 8601 datetime, required): Creation timestamp
- `updated_at` (ISO 8601 datetime, required): Last update timestamp

---

### 2. Get All Organizers

**Endpoint:** `GET /api/organizers`

**Headers:**
```
X-API-Key: <api_key>
```

**Response:** 200 OK
```json
{
  "organizers": [
    {
      "id": 1,
      "name": "Innovation Summit",
      "website": "https://innovationsummit.com",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Field Specifications:**
- `id` (integer, required): Unique identifier
- `name` (string, required): Organizer name
- `website` (string, optional): Website URL
- `created_at` (ISO 8601 datetime, required): Creation timestamp
- `updated_at` (ISO 8601 datetime, required): Last update timestamp

---

### 3. Get All Sponsors

**Endpoint:** `GET /api/sponsors`

**Headers:**
```
X-API-Key: <api_key>
```

**Response:** 200 OK
```json
{
  "sponsors": [
    {
      "id": 1,
      "name": "CloudSystems Inc",
      "website": "https://cloudsystems.com",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Field Specifications:**
- `id` (integer, required): Unique identifier
- `name` (string, required): Sponsor name
- `website` (string, optional): Website URL
- `created_at` (ISO 8601 datetime, required): Creation timestamp
- `updated_at` (ISO 8601 datetime, required): Last update timestamp

---

## Optional: Delta Sync Support

For efficiency, the Resources Centre can optionally support delta syncs by accepting a `since` query parameter:

**Example:**
```
GET /api/speakers?since=2024-01-15T10:30:00Z
```

This returns only records created or updated after the specified timestamp, reducing payload size for incremental syncs.

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Invalid or missing API key"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Description of the error"
}
```

---

## Implementation Notes

### Flask Example (Python)

```python
from flask import Blueprint, jsonify, request
from functools import wraps
import os

api_bp = Blueprint('api', __name__, url_prefix='/api')

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if api_key != os.environ.get('API_KEY'):
            return jsonify({'error': 'Invalid or missing API key'}), 401
        return f(*args, **kwargs)
    return decorated_function

@api_bp.route('/speakers', methods=['GET'])
@require_api_key
def get_speakers():
    # Query speakers from database
    speakers = Speaker.query.all()
    return jsonify({
        'speakers': [speaker.to_dict() for speaker in speakers]
    })

@api_bp.route('/organizers', methods=['GET'])
@require_api_key
def get_organizers():
    organizers = Organizer.query.all()
    return jsonify({
        'organizers': [org.to_dict() for org in organizers]
    })

@api_bp.route('/sponsors', methods=['GET'])
@require_api_key
def get_sponsors():
    sponsors = Sponsor.query.all()
    return jsonify({
        'sponsors': [sponsor.to_dict() for sponsor in sponsors]
    })
```

---

## Testing

Use curl or Postman to test the endpoints:

```bash
# Test speakers endpoint
curl -H "X-API-Key: your-api-key-here" \
  https://workspace.wh5q8xynmq.repl.co/api/speakers

# Test organizers endpoint
curl -H "X-API-Key: your-api-key-here" \
  https://workspace.wh5q8xynmq.repl.co/api/organizers

# Test sponsors endpoint
curl -H "X-API-Key: your-api-key-here" \
  https://workspace.wh5q8xynmq.repl.co/api/sponsors
```

Expected response structure for each endpoint is documented above.
