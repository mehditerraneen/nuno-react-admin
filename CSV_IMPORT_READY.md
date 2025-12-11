# CSV Import - Ready to Use! ✅

## Summary

The CSV importer has been successfully adapted to work with your grid-based planning format!

### What Was Done

1. ✅ **Backend Updated** - `/planning/monthly-planning/{planning_id}/import-csv` endpoint now supports:
   - Employee abbreviations (not just IDs)
   - Automatic employee lookup by abbreviation
   - Comprehensive error reporting

2. ✅ **Frontend Updated** - Automatic detection of CSV format:
   - Grid format (your official planning files)
   - Simple format (abbreviation,date,shift_code)
   - Automatic abbreviation cleanup (removes parentheses)

3. ✅ **Protection Enabled** - All imported shifts:
   - Marked as `source='MANUAL'`
   - Set to `is_locked=True`
   - Won't be modified by optimizer

## Test Results

Tested with: `/Users/mehdi/Downloads/temp/SUR.LU Plannings 2025 (officiel) - DECEMBRE 2025.csv`

### ✅ Successfully Imported: 111 shifts

| Employee | Abbreviation | Shifts | Status |
|----------|--------------|--------|--------|
| Sara Karin Allamano | AS | 14 | ✅ Imported |
| Hajar Biad | BH | 16 | ✅ Imported |
| Neda Dostanic | DN | 14 | ✅ Imported |
| Madeleine Sita Osso Komach | MO | 15 | ✅ Imported |
| Sylvie Miconi Miconi | MS | 11 | ✅ Imported |
| Nadine Kayigi Kayigi | NK | 15 | ✅ Imported |
| Priscila Ochido | OP | 16 | ✅ Imported |
| Sabrina HADJADJ | SH | 10 | ✅ Imported |

### ❌ Not Imported: 59 shifts

These employees are in the CSV but NOT in the database:

| CSV Abbreviation | Original in CSV | Shifts | Issue |
|------------------|-----------------|--------|-------|
| AC | AC (ANA) | 18 | Employee not found in database |
| SK | SK (SEJLA) | 16 | Employee not found in database |
| JOHANNA | JOHANNA | 8 | Employee not found in database |
| NADIA | NADIA | 17 | Employee not found in database |

## How to Use

### Via Web Interface

1. Open planning view: `http://localhost:5173/#/planning/monthly-planning/1/show`
2. Click the **Upload CSV** button (📤 icon)
3. Select your CSV file
4. Click **Import**
5. Check results in browser console and notification

### What Happens During Import

**Frontend (Browser Console):**
```
📋 Detected grid format - parsing...
   Processing employee: AC
   Processing employee: BH
   ...
✅ Parsed 170 shifts from grid format
📤 Sending to backend...
```

**Backend (FastAPI Server Console):**
```
================================================================================
📋 CSV IMPORT STARTED - Planning 1: DÉCEMBRE 2025
================================================================================
Total shifts in CSV: 170
================================================================================

✅ Created [1/170] BH (Hajar Biad) - 2025-12-01 - M6.5-15 (8.0h)
✅ Created [2/170] BH (Hajar Biad) - 2025-12-02 - M6.5-15 (8.0h)
...
❌ Employee abbreviation 'AC' not found
...

================================================================================
✅ CSV IMPORT COMPLETED
================================================================================
✅ Successfully imported: 111
❌ Errors: 59
================================================================================
```

## Next Steps to Import Missing Employees

### Option 1: Add Missing Employees to Database

Add these employees to your system:
- AC (Ana) - 18 shifts waiting
- SK (Sejla) - 16 shifts waiting
- JOHANNA - 8 shifts waiting
- NADIA - 17 shifts waiting

Once added, re-run the import and all 170 shifts will be imported.

### Option 2: Remove from CSV

If these employees shouldn't be in the December 2025 planning, you can ignore the errors.

### Option 3: Map to Existing Employees

If these are actually existing employees with different abbreviations, update the CSV:
1. Check if "AC (ANA)" should actually be a different employee
2. Check if "SK (SEJLA)" should actually be a different employee
3. etc.

## CSV Format Reference

### Grid Format (Auto-detected)

Your official planning files are automatically recognized:

```csv
n,,,,,,,,,,,,,,,,,,,,,,,,,
,Année :,2025,,,Planning mois  Décembre 2025,,,,,,,,
[... metadata rows ...]
"8,00",AC (ANA),160,"168,00",...,S13.5-22,S13.5-22,OFF,M6.5-15,...
"8,00",BH,168,"168,00",...,M6.5-15,M6.5-15,S12.5-21,OFF,...
```

**Features:**
- Automatically detected
- Employees in column 1 (row 9+)
- Days in columns 5-35
- Abbreviations cleaned (parentheses removed)
- OFF, CP (leave), and "cours" (training) are skipped

### Simple Format

You can also use a simpler format:

```csv
abbreviation,date,shift_code
BH,2025-12-01,M6.5-15
DN,2025-12-01,S13.5-22
AS,2025-12-02,M6.5-15
```

## Troubleshooting

### "Employee abbreviation 'XX' not found"
- Check if employee exists: `http://localhost:8000/fast/planning/monthly-planning/1/calendar`
- Verify abbreviation matches exactly (case-sensitive)
- Add employee to system if missing

### "Shift code 'XXX' not found"
- Check shift types: Navigate to Shift Types in admin
- Ensure shift code exists and is marked as active
- Common codes: M6.5-15, S13.5-22, M6.5-12.5, S12.5-21

### "Date not in planning month"
- Verify planning ID is correct
- Check planning month/year matches CSV data

## Files Modified

### Backend
- `/nuno/inur.django/fastapi_app/routers/planning.py` (lines 1430-1568)
  - Added `CsvShiftImport` schema
  - Added `CsvImportRequest` schema
  - Added `import_csv_shifts` endpoint

### Frontend
- `/nuno/nuno-react-admin/src/planning-better.tsx` (lines 1403-1548)
  - Updated CSV parser to handle grid format
  - Added abbreviation cleaning
  - Added automatic format detection
  - Updated dialog instructions

## Summary

**Status:** ✅ Ready to use!

**Current Result:** 111/170 shifts imported (65%)

**To get 100%:** Add 4 missing employees (AC, SK, JOHANNA, NADIA) to the database

**Import Protection:** ✅ All imported shifts protected from optimizer
