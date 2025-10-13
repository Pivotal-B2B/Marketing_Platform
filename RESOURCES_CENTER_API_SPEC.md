# Resources Center API Specification

## Overview
This document specifies the API endpoint that the **Pivotal B2B Resources Center** (public-facing Repl) must implement to receive content pushed from the **Pivotal CRM Dashboard** (internal Repl).

## Security Architecture

### HMAC-SHA256 Authentication
All requests are authenticated using HMAC-SHA256 signatures to ensure content integrity and prevent unauthorized access.

#### Authentication Headers
- `X-Signature`: HMAC-SHA256 signature of the request
- `X-Timestamp`: Unix timestamp (milliseconds) when request was created

#### Signature Generation
```javascript
const message = `${timestamp}.${JSON.stringify(payload)}`;
const signature = crypto
  .createHmac('sha256', PUSH_SECRET_KEY)
  .update(message)
  .digest('hex');
```

#### Signature Verification (Resources Center)
```javascript
function verifyHMACSignature(payload, timestamp, receivedSignature) {
  // Verify timestamp is recent (prevent replay attacks)
  const now = Date.now();
  const age = now - parseInt(timestamp);
  if (age > 300000) { // 5 minutes
    throw new Error('Request timestamp too old');
  }

  // Regenerate signature
  const message = `${timestamp}.${JSON.stringify(payload)}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.PUSH_SECRET_KEY)
    .update(message)
    .digest('hex');

  // Compare signatures (timing-safe)
  if (expectedSignature !== receivedSignature) {
    throw new Error('Invalid signature');
  }

  return true;
}
```

## Endpoint Specification

### POST /api/import/content

**Purpose**: Receive and import content assets from Dashboard

**Authentication**: HMAC-SHA256 via headers

**Request Headers**:
```
Content-Type: application/json
X-Signature: <hmac-sha256-signature>
X-Timestamp: <unix-timestamp-ms>
```

**Request Payload**:
```typescript
interface ContentImportPayload {
  assetId: string;           // Original asset ID from Dashboard
  assetType: string;         // Type: landing_page, blog_post, event, etc.
  title: string;             // Asset title
  slug?: string;             // URL-friendly slug (auto-generated if not provided)
  summary?: string;          // Short description/excerpt
  bodyHtml?: string;         // Full HTML content
  thumbnailUrl?: string;     // Featured image URL
  ctaLink?: string;          // Call-to-action link
  formId?: string;           // Associated form ID (if applicable)
  tags?: string[];           // Content tags/categories
  metadata?: any;            // Additional custom metadata
  syncedAt: string;          // ISO 8601 timestamp of sync
}
```

**Example Request**:
```bash
POST https://resources.pivotal-b2b.com/api/import/content
Headers:
  Content-Type: application/json
  X-Signature: a7f3b8c9d2e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9
  X-Timestamp: 1697123456789

Body:
{
  "assetId": "ast_123xyz",
  "assetType": "landing_page",
  "title": "The Business Owner's Guide to Simplifying HR",
  "slug": "simplify-hr-guide",
  "summary": "Learn how to save 5–10 hours per week with smarter HR processes",
  "bodyHtml": "<h1>Simplifying HR</h1><p>Content here...</p>",
  "thumbnailUrl": "https://assets.pivotal.com/hr-guide.jpg",
  "ctaLink": "https://crm.pivotal-b2b.com/demo",
  "formId": "frm_109",
  "tags": ["HR", "Productivity", "Guide"],
  "metadata": {
    "industry": "Professional Services",
    "wordCount": 1500
  },
  "syncedAt": "2025-10-13T09:00:00Z"
}
```

**Response (Success - 200/201)**:
```json
{
  "status": "success",
  "message": "Content imported successfully",
  "externalId": "rc_content_456",
  "publicUrl": "https://resources.pivotal-b2b.com/resources/simplify-hr-guide",
  "syncedAt": "2025-10-13T09:00:05Z"
}
```

**Response (Error - 400)**:
```json
{
  "status": "error",
  "message": "Invalid signature",
  "code": "INVALID_SIGNATURE"
}
```

**Response (Error - 422)**:
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

## Database Schema (Resources Center)

### Recommended Schema
```sql
CREATE TABLE imported_content (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR UNIQUE NOT NULL,  -- assetId from Dashboard
  asset_type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  summary TEXT,
  body_html TEXT,
  thumbnail_url VARCHAR,
  cta_link VARCHAR,
  form_id VARCHAR,
  tags TEXT[],
  metadata JSONB,
  status VARCHAR DEFAULT 'published',
  synced_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_imported_content_type ON imported_content(asset_type);
CREATE INDEX idx_imported_content_slug ON imported_content(slug);
CREATE INDEX idx_imported_content_tags ON imported_content USING GIN(tags);
```

## Content Types & Routing

### Supported Asset Types
| Asset Type      | Public Route                    | Use Case                          |
|-----------------|---------------------------------|-----------------------------------|
| landing_page    | /resources/:slug                | Gated content, lead gen          |
| blog_post       | /blog/:slug                     | SEO content, thought leadership  |
| event           | /events/:slug                   | Webinars, conferences            |
| case_study      | /case-studies/:slug             | Customer success stories         |
| whitepaper      | /resources/whitepapers/:slug    | Technical documents              |
| ebook           | /resources/ebooks/:slug         | Long-form guides                 |

### Dynamic Routing Example
```javascript
// Resources Center routes.js
app.get('/resources/:slug', async (req, res) => {
  const content = await db.query(
    'SELECT * FROM imported_content WHERE slug = $1 AND asset_type = $2',
    [req.params.slug, 'landing_page']
  );
  
  if (!content) {
    return res.status(404).render('404');
  }
  
  res.render('landing-page', { content });
});
```

## Form Prefill Integration

### Query Parameter Mapping
When Dashboard links to Resources Center content with contact data:

**Dashboard sends**:
```
https://resources.pivotal-b2b.com/resources/simplify-hr-guide
  ?first_name=John
  &email=john@acme.com
  &company=Acme%20Ltd
  &source=email_campaign_123
```

**Resources Center parses and prefills**:
```javascript
// Form component (React/Vue/etc)
const urlParams = new URLSearchParams(window.location.search);

const formData = {
  firstName: urlParams.get('first_name') || '',
  email: urlParams.get('email') || '',
  company: urlParams.get('company') || '',
  // Hidden field for tracking
  source: urlParams.get('source') || 'organic'
};
```

### Form Submission Flow
1. User fills/submits form on Resources Center
2. Form data POSTs to Dashboard's lead capture endpoint
3. Dashboard creates lead record with source tracking
4. Optional: Resources Center shows thank-you page

## Environment Variables (Resources Center)

```env
# Security
PUSH_SECRET_KEY=<shared-secret-with-dashboard>

# Database
DATABASE_URL=<postgresql-connection-string>

# Dashboard Integration
DASHBOARD_LEAD_CAPTURE_URL=https://dashboard.pivotal.com/api/leads/capture
```

## Environment Variables (Dashboard)

```env
# Security
PUSH_SECRET_KEY=<shared-secret-with-resources-center>

# Resources Center
RESOURCES_CENTER_URL=https://resources.pivotal-b2b.com
```

## Retry & Error Handling

### Dashboard Retry Logic
- Max attempts: 3
- Backoff: Exponential (2^attempt * 1000ms)
- Statuses tracked: pending → in_progress → success/failed

### Resources Center Error Codes
| Code              | HTTP | Description                        |
|-------------------|------|------------------------------------|
| INVALID_SIGNATURE | 401  | HMAC signature verification failed |
| TIMESTAMP_EXPIRED | 401  | Request timestamp too old          |
| VALIDATION_ERROR  | 422  | Payload validation failed          |
| DUPLICATE_CONTENT | 409  | Content with same externalId exists|
| SERVER_ERROR      | 500  | Internal server error              |

## Testing the Integration

### 1. Generate Test Signature
```javascript
const crypto = require('crypto');
const payload = {
  assetId: 'test_123',
  assetType: 'landing_page',
  title: 'Test Content',
  syncedAt: new Date().toISOString()
};

const payloadString = JSON.stringify(payload);
const timestamp = Date.now().toString();
const signature = crypto
  .createHmac('sha256', 'your-shared-secret')
  .update(`${timestamp}.${payloadString}`)
  .digest('hex');

console.log('X-Signature:', signature);
console.log('X-Timestamp:', timestamp);
```

### 2. Test with cURL
```bash
curl -X POST https://resources.pivotal-b2b.com/api/import/content \
  -H "Content-Type: application/json" \
  -H "X-Signature: <generated-signature>" \
  -H "X-Timestamp: <timestamp>" \
  -d '{
    "assetId": "test_123",
    "assetType": "landing_page",
    "title": "Test Content",
    "slug": "test-content",
    "syncedAt": "2025-10-13T09:00:00Z"
  }'
```

### 3. Verify Response
- Status: 200 or 201
- Body contains `externalId` and `publicUrl`
- Check database for new record

## Monitoring & Analytics

### Push Metrics (Dashboard)
- Total pushes attempted
- Success rate
- Average response time
- Failed push reasons

### Content Metrics (Resources Center)
- Views per asset
- Form submissions per asset
- Conversion rate by asset type
- Top performing content

### Webhook (Optional)
Resources Center can send engagement data back to Dashboard:

```javascript
// POST to Dashboard webhook
POST https://dashboard.pivotal.com/api/webhooks/content-engagement
{
  "externalId": "ast_123xyz",
  "eventType": "view" | "download" | "form_submit",
  "timestamp": "2025-10-13T10:30:00Z",
  "metadata": {
    "visitorId": "visitor_789",
    "referrer": "google.com"
  }
}
```

## Support & Troubleshooting

### Common Issues

**1. Signature Mismatch**
- Ensure both systems use same `PUSH_SECRET_KEY`
- Check payload is identical (no whitespace changes)
- Verify timestamp is in milliseconds

**2. Duplicate Content**
- Check `external_id` (assetId) uniqueness
- Implement upsert logic if updates are expected

**3. Missing Content**
- Verify slug generation is URL-safe
- Check asset_type routing matches expected values

### Debug Mode
```javascript
// Resources Center endpoint (dev only)
if (process.env.NODE_ENV === 'development') {
  console.log('Received payload:', req.body);
  console.log('Signature:', req.headers['x-signature']);
  console.log('Timestamp:', req.headers['x-timestamp']);
}
```

---

## Quick Start Checklist

### Resources Center Setup
- [ ] Install HMAC signature verification middleware
- [ ] Create `imported_content` database table
- [ ] Implement POST `/api/import/content` endpoint
- [ ] Set `PUSH_SECRET_KEY` environment variable
- [ ] Add dynamic routing for content types
- [ ] Implement form prefill logic
- [ ] Test with Dashboard integration

### Dashboard Setup (Already Complete ✅)
- [x] Push service with HMAC signature generation
- [x] Push tracking database schema
- [x] API endpoints for push/retry
- [x] UI for push management
- [x] Environment variables configured

---

**Version**: 1.0  
**Last Updated**: October 13, 2025  
**Maintainer**: Pivotal CRM Team
