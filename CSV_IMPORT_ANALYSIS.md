# CSV Import Analysis for December 2025 Planning

## Summary

✅ **The CSV can be imported** - but you need to provide employee ID mappings first.

The CSV file contains **170 shifts** for **12 employees** using **4 different shift codes**.

## CSV Structure

The file uses a **grid-based format**:
- Employees as rows (with abbreviations)
- Days 1-31 as columns
- Shift codes in cells

### Employees Found in CSV

| Abbreviation    | Shifts | Notes |
|----------------|--------|-------|
| AC (ANA)       | 18     | Ana - 8h/day |
| BH             | 16     | Unknown - 8h/day |
| NK (Nadine)    | 15     | Nadine - 6.4h/day |
| DN             | 14     | Unknown - 8h/day |
| OP             | 16     | Priscila Ochido - 6.4h/day |
| SH             | 10     | Unknown - 8h/day |
| SK (SEJLA)     | 16     | Sejla - 8h/day |
| AS (SARA)      | 14     | Sara - 6.4h/day |
| MO (MADELEINE) | 15     | Madeleine - 8h/day |
| NADIA          | 17     | Nadia - 8h/day |
| JOHANNA        | 8      | Johanna - 8h/day |
| MS (Sylvie)    | 11     | Sylvie Miconi - 6.4h/day |

### Shift Codes Used

| Code       | Likely Meaning | Count |
|-----------|----------------|-------|
| M6.5-15   | Morning 6:30-15:00 | Most common |
| S13.5-22  | Evening 13:30-22:00 | Common |
| M6.5-12.5 | Short morning 6:30-12:30 | Rare |
| S12.5-21  | Evening 12:30-21:00 | Rare |

### Codes Excluded from Import

The following codes in the CSV are **NOT** imported (as they're not work shifts):
- `OFF` - Day off
- `CP8`, `CP6.4` - Paid leave (congé payé)
- `cours` - Training/courses
- Empty cells

## Next Steps to Import

### 1. Get Employee ID Mappings

You need to map CSV abbreviations to database employee IDs. Run one of these:

**Option A: Via React Admin**
- Open the planning view at `http://localhost:5173/#/planning/monthly-planning/1/show`
- Open browser dev tools console
- The employee data will show IDs and abbreviations

**Option B: Via Django Shell** (if you have access)
```python
from planning.models import Employee

for emp in Employee.objects.all().order_by('abbreviation'):
    print(f"{emp.id}: {emp.abbreviation} - {emp.user.get_full_name()}")
```

**Option C: Via Django Admin**
- Go to `/admin/planning/employee/`
- Look at the ID column for each employee

### 2. Update the Conversion Script

Edit `convert-csv.py` and update the `EMPLOYEE_MAP` dictionary:

```python
EMPLOYEE_MAP = {
    'AC (ANA)': 1,      # Replace with actual ID
    'BH': 2,
    'NK (Nadine)': 3,
    'DN': 4,
    'OP': 5,            # Priscila Ochido
    'SH': 6,
    'SK (SEJLA)': 7,
    'AS (SARA)': 8,
    'MO (MADELEINE)': 9,
    'NADIA': 10,
    'JOHANNA': 11,
    'MS (Sylvie)': 12,  # Sylvie Miconi Miconi
}
```

### 3. Run the Conversion

```bash
cd /Users/mehdi/workspace/clients/inur-sur.lu/nuno/nuno-react-admin
python3 convert-csv.py
```

This will create: `/Users/mehdi/Downloads/temp/DECEMBRE_2025_import.csv`

### 4. Import via Web Interface

1. Open the planning view: `http://localhost:5173/#/planning/monthly-planning/1/show`
2. Click the **Upload CSV** button (📤 icon)
3. Select the converted file: `DECEMBRE_2025_import.csv`
4. Click **Import**
5. Check the FastAPI console for detailed import logs
6. Check the browser console for the import response data

## Validation Checklist

Before importing, verify:

- ✅ All shift codes exist in your `ShiftType` table (`M6.5-15`, `S13.5-22`, etc.)
- ✅ All employee IDs are valid and active
- ✅ Planning ID 1 is for December 2025
- ✅ No existing shifts will be accidentally overwritten (they'll be marked as updated)
- ✅ All imported shifts will be marked as `source='MANUAL'` and `is_locked=True`

## Expected Result

After import:
- **170 shifts** will be created/updated
- All shifts protected from optimizer (`source='MANUAL'` + `is_locked=True`)
- Detailed console logs showing each shift imported
- API response with full breakdown of imported data

## Troubleshooting

### "Employee ID not found"
- Check that the employee ID mapping is correct
- Verify the employee exists and is active in the database

### "Shift code not found"
- Check that all shift codes (`M6.5-15`, etc.) exist in `ShiftType` table
- Verify they are marked as `is_active=True`

### "Date not in planning month"
- Verify planning ID 1 is for December 2025
- Check year and month fields in the planning record

## Scripts Created

Two analysis scripts are available:

1. **analyze-csv.py** - Analyzes the original CSV structure
   - Shows employee list and shift counts
   - Lists all shift codes used
   - No conversion, just analysis

2. **convert-csv.py** - Converts CSV to import format
   - Requires employee ID mappings
   - Generates import-ready CSV file
   - Provides detailed summary of conversion
