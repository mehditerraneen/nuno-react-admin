# nunoOllama Integration Guide

This document explains how the React Admin application integrates with the nunoOllama AI Orchestrator service.

## Overview

The React Admin application now connects to your deployed nunoOllama service at `https://nunoollama.opefitoo.com` for AI-powered planning optimization assistance.

## Configuration

### Environment Variables

**File**: `.env`

```bash
VITE_SIMPLE_REST_URL=http://localhost:8000/fast

# AI Orchestrator Configuration
VITE_AI_ORCHESTRATOR_URL=https://nunoollama.opefitoo.com
VITE_AI_ORCHESTRATOR_API_KEY=79FNVaF6Y3W241B4ZWHRwHHWa_L5ca7f-L-qFR_GYhs
```

**Important**: Use `localhost` instead of `127.0.0.1` to avoid CORS issues when the Vite dev server runs on `localhost:5173` or similar.

**Important**: The `.env` file is in `.gitignore` and will NOT be committed to git.

### For Production Deployment

Update these environment variables in your production deployment:

1. **Vercel/Netlify**: Add environment variables in project settings
2. **Docker**: Pass as environment variables or mount `.env` file
3. **Other platforms**: Follow their environment variable configuration

## Component Integration

### OptimizerAIChat Component

**File**: `src/components/OptimizerAIChat.tsx`

**Changes Made**:
1. Added `AI_ORCHESTRATOR_API_KEY` constant (line 68)
2. Updated `getQuickAdvice()` function to include `X-API-Key` header (lines 178-196)

```typescript
// Read from environment
const AI_ORCHESTRATOR_API_KEY = import.meta.env.VITE_AI_ORCHESTRATOR_API_KEY || '';

// Include in API calls
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};

if (AI_ORCHESTRATOR_API_KEY) {
  headers['X-API-Key'] = AI_ORCHESTRATOR_API_KEY;
}

const response = await fetch(`${AI_ORCHESTRATOR_URL}/quick-advice`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    failure_message: failureMessage || userMessage.content,
    strategies_attempted: ['Full constraints', 'Relaxed'],
  }),
});
```

## API Endpoints Used

### 1. Quick Advice (Primary)

**Endpoint**: `POST /quick-advice`
**Authentication**: Required - `X-API-Key` header
**Usage**: Fast AI advice without full diagnostics

**Request**:
```json
{
  "failure_message": "INFEASIBLE",
  "strategies_attempted": ["Full constraints", "Relaxed"]
}
```

**Response**:
```json
{
  "advice": "The optimization failed because...",
  "timestamp": "2025-01-02T10:30:00.000Z"
}
```

### 2. Full Analysis (Future)

**Endpoint**: `POST /analyze-planning`
**Authentication**: Required - `X-API-Key` header
**Usage**: Comprehensive diagnostic analysis

**Note**: Currently calls Django backend at `/planning/{id}/ai-analysis` which forwards to nunoOllama.

## How It Works

### User Flow

1. User optimizes planning in React Admin
2. If optimization fails → AI Chat auto-opens with failure message
3. User can ask questions in French (e.g., "Pourquoi ça échoue?")
4. Component detects intent and calls appropriate endpoint
5. AI response displayed with formatted advice

### Authentication Flow

```
React Admin Component
  ↓ (includes X-API-Key header)
nunoOllama FastAPI Service
  ↓ (validates API key)
Ollama LLM (local)
  ↓ (generates advice)
Response → User
```

## Testing

### Local Development

1. **Start Vite dev server**:
   ```bash
   cd /Users/mehdi/workspace/clients/inur-sur.lu/nuno/nuno-react-admin
   npm run dev
   ```

2. **Verify environment variables loaded**:
   Open browser console and check:
   ```javascript
   import.meta.env.VITE_AI_ORCHESTRATOR_URL
   import.meta.env.VITE_AI_ORCHESTRATOR_API_KEY
   ```

3. **Test AI chat**:
   - Navigate to Planning page
   - Click "Optimizer" button
   - Trigger optimization (with/without failure)
   - Click AI Assistant FAB button (purple icon, bottom-right)
   - Ask a question in the chat

### Production Testing

1. **Test without API key** (should fail):
   ```bash
   curl -X POST https://nunoollama.opefitoo.com/quick-advice \
     -H "Content-Type: application/json" \
     -d '{"failure_message": "test", "strategies_attempted": []}'
   ```

   Expected: `403 Forbidden` - "Invalid or missing API key"

2. **Test with valid API key** (should succeed):
   ```bash
   curl -X POST https://nunoollama.opefitoo.com/quick-advice \
     -H "Content-Type: application/json" \
     -H "X-API-Key: 79FNVaF6Y3W241B4ZWHRwHHWa_L5ca7f-L-qFR_GYhs" \
     -d '{"failure_message": "INFEASIBLE", "strategies_attempted": ["full"]}'
   ```

   Expected: `200 OK` with AI advice

## Security Notes

### API Key Protection

✅ **DO**:
- Store API key in `.env` file (gitignored)
- Use environment variables in production
- Rotate keys periodically
- Keep keys secret

❌ **DON'T**:
- Commit API key to git
- Hard-code in source files
- Share keys publicly
- Use same key for dev and production

### CORS Configuration

The nunoOllama service allows all origins (`allow_origins=["*"]`). For production, consider restricting to your React Admin domain:

```python
# In nunoAIPlanning/docker/server.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-react-admin-domain.com"],  # Restrict
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Troubleshooting

### Problem: "Service AI indisponible (403)"

**Cause**: API key missing or invalid

**Solutions**:
1. Check `.env` file has correct `VITE_AI_ORCHESTRATOR_API_KEY`
2. Restart Vite dev server after changing `.env`
3. Verify API key matches the one set in nunoOllama deployment

```bash
# Check current value
cat .env | grep VITE_AI_ORCHESTRATOR_API_KEY

# Restart Vite
# Press Ctrl+C in terminal
npm run dev
```

### Problem: "Service AI indisponible (404)"

**Cause**: nunoOllama service not accessible or routing issue

**Solutions**:
1. Verify service is running: `curl https://nunoollama.opefitoo.com/health`
2. Check Dokploy logs for routing errors
3. Verify Service Name in Dokploy = `ai-planning`
4. Check Traefik configuration

### Problem: CORS errors in browser console

**Cause**: Browser blocking cross-origin requests

**Solutions**:
1. Verify nunoOllama has CORS enabled (it should be by default)
2. Check browser console for specific CORS error
3. Ensure requests include proper headers

### Problem: No response after clicking "Send"

**Cause**: Network error, timeout, or service down

**Solutions**:
1. Check browser Network tab for failed requests
2. Verify nunoOllama service is healthy
3. Check if Ollama model is loaded (can take 30-60s first time)
4. Look for errors in browser console

## Development Workflow

### Adding New AI Features

1. **Add new endpoint to nunoOllama** (`docker/server.py`)
2. **Add new function to OptimizerAIChat.tsx**:
   ```typescript
   const callNewEndpoint = async () => {
     const headers: Record<string, string> = {
       'Content-Type': 'application/json',
     };

     if (AI_ORCHESTRATOR_API_KEY) {
       headers['X-API-Key'] = AI_ORCHESTRATOR_API_KEY;
     }

     const response = await fetch(`${AI_ORCHESTRATOR_URL}/new-endpoint`, {
       method: 'POST',
       headers,
       body: JSON.stringify({...}),
     });

     // Handle response...
   };
   ```
3. **Test locally** with `npm run dev`
4. **Deploy** and test in production

### Updating API Key

1. **Generate new key**:
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Update in nunoOllama**:
   - Update `API_KEY` in Dokploy environment variables
   - Restart service

3. **Update in React Admin**:
   - Update `VITE_AI_ORCHESTRATOR_API_KEY` in `.env`
   - Restart dev server
   - Update production environment variables
   - Redeploy

## Summary

✅ **React Admin now connects to nunoOllama**
✅ **API key authentication implemented**
✅ **Environment variables configured**
✅ **CORS enabled for cross-origin requests**
✅ **Error handling and user feedback implemented**

Your AI chat is ready to use! 🤖
