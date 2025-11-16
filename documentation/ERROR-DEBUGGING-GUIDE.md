# Error Debugging Guide for Care Plan Details

## Quick Debug Steps for 422 Errors

### 1. Check Browser Console
When you get a 422 error, immediately check:
```javascript
// Look for these console logs:
🚀 Submitting Care Plan Detail: {...}  // Your form data
🚨 Form Submission Error - Create Care Plan Detail  // Detailed error info
```

### 2. Use the Form Debugger
The form now includes a built-in debugger (visible in development mode):
- Click the "Form Debugger" accordion in the dialog
- See current form data, validation errors, and raw API responses
- Copy error details to clipboard for analysis

### 3. Backend Error Logging Setup

Add this to your FastAPI endpoint to get detailed error info:

```python
import logging
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    logger.error(f"❌ Validation Error on {request.method} {request.url}")
    logger.error(f"📝 Request Body: {body.decode()}")
    logger.error(f"🔍 Validation Details: {exc.errors()}")
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "request_body": body.decode(),
            "url": str(request.url)
        }
    )
```

## Common Issues & Solutions

### Issue 1: Missing Required Fields
**Symptoms:** 422 error with `"type": "missing"`
**Check:** Form fields match backend expectations
**Solution:** Verify all required fields are filled

### Issue 2: Incorrect Data Types
**Symptoms:** 422 error with `"type": "type_error"`
**Common Causes:**
- `time_start`/`time_end` format (expect "HH:MM" string)
- `quantity` not a number
- `params_occurrence_ids` not an array

### Issue 3: Long Term Care Items Array Structure
**Expected Backend Format:**
```json
{
  "long_term_care_items": [
    {
      "long_term_care_item_id": 123,
      "quantity": 2
    }
  ]
}
```

**Check:** Form sends this exact structure

### Issue 4: CNS Care Plan Filtering
**Symptoms:** No items available in dropdown
**Debug Steps:**
1. Check console: `CNS Care Plan ID: ...`
2. Verify care plan has `medical_care_summary_per_patient_id`
3. Check if CNS plan has items: `CNS available item IDs: [...]`

## Debugging Tools Features

### 1. Enhanced Error Logging
```javascript
// Automatic detailed logging on errors
logFormSubmissionError(formData, apiError, context);
```

### 2. Validation Error Parsing
```javascript
// Converts API errors to user-friendly messages
const errors = parseValidationErrors(apiError);
```

### 3. Form State Monitoring
- Shows current form data
- Displays React Hook Form errors
- Shows API validation errors
- Provides copy-to-clipboard functionality

### 4. Smart Error Display
- Field-specific error messages
- User-friendly field names
- Grouped error categories

## Example Debug Session

1. **Fill form and submit**
2. **Check console output:**
   ```javascript
   🚀 Submitting Care Plan Detail: {
     "name": "Morning Care",
     "params_occurrence_ids": [1, 2], 
     "time_start": "09:00",
     "time_end": "10:00",
     "long_term_care_items": [
       {
         "long_term_care_item_id": 123,
         "quantity": 1
       }
     ],
     "care_actions": "Basic care routine"
   }
   ```
3. **If 422 error, check error details:**
   ```javascript
   🚨 Form Submission Error - Create Care Plan Detail
   📝 Form Data Submitted: {...}
   ❌ API Error Response: {
     "detail": [
       {
         "loc": ["body", "time_start"],
         "msg": "field required",
         "type": "missing"
       }
     ]
   }
   ```
4. **Fix identified issues and resubmit**

## Backend Debugging Tips

### FastAPI Logs to Check
```bash
# Run your server with debug logging
uvicorn main:app --reload --log-level debug

# Look for these logs:
INFO: 127.0.0.1:54551 - "POST /fast/careplans/246/details HTTP/1.1" 422
ERROR: Validation Error on POST http://localhost:8000/careplans/246/details
ERROR: Request Body: {"name":"test",...}
ERROR: Validation Details: [{"loc":["body","field"],"msg":"field required"}]
```

### Common Backend Issues
1. **Field name mismatches** - Frontend sends `time_start`, backend expects `start_time`
2. **Missing Pydantic model fields** - Backend model doesn't include all required fields
3. **Validation constraints** - Backend has additional validation rules not reflected in frontend

## Testing Your Fixes

### 1. Unit Test for Error Handling
```javascript
// Test error parsing
import { parseValidationErrors } from './utils/errorHandling';

const apiError = {
  detail: [
    { loc: ['body', 'name'], msg: 'field required', type: 'missing' }
  ]
};

const errors = parseValidationErrors(apiError);
expect(errors.name.message).toBe('field required');
```

### 2. Integration Test
```javascript
// Test form submission with mock API
test('should handle validation errors gracefully', async ({ page }) => {
  // Mock 422 response
  await page.route('**/careplans/*/details', route => {
    route.fulfill({
      status: 422,
      body: JSON.stringify({ 
        detail: [{ loc: ['body', 'name'], msg: 'field required' }] 
      })
    });
  });
  
  // Submit form and verify error display
  await page.click('[data-testid="save-button"]');
  await expect(page.getByText('field required')).toBeVisible();
});
```

## Best Practices

### 1. Always Log Form Data Before Submission
```javascript
console.log("🚀 Submitting:", JSON.stringify(formData, null, 2));
```

### 2. Use Development Mode Debugger
```javascript
<FormDebugger 
  formData={formData}
  validationErrors={errors}
  apiError={lastError}
  isVisible={process.env.NODE_ENV === 'development'}
/>
```

### 3. Implement Graceful Error Recovery
```javascript
// Clear errors when user starts typing
useEffect(() => {
  if (formIsDirty) {
    setValidationErrors({});
  }
}, [formIsDirty]);
```

### 4. Provide Clear User Feedback
```javascript
// Show specific field errors
<TextInput 
  source="name"
  error={!!validationErrors.name}
  helperText={validationErrors.name}
/>
```

This comprehensive debugging setup will help you quickly identify and fix validation issues!