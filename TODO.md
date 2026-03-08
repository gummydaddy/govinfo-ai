# Implementation TODO - Dynamic Sectors & Other Intent Option

## Task Overview
Make primary industry sector options dynamic based on Ministry/Department entries in admin panel, and add "Other" option for core objective.

## Steps to Complete

- [x] 1. Update State Service - Add `availableSectors` computed property and `normalizeSectorName` function
- [x] 2. Update Setup Component - Replace hardcoded sectors with dynamic sectors from state service
- [x] 3. Update Setup Component - Add "Other" option in Intent step with custom input
- [x] 4. Update Admin Component - Normalize ministry names when uploading documents

## Implementation Details

### Step 1: State Service
- Added `normalizeSectorName()` method for case-insensitive + space-insensitive duplicate detection
- Added `availableSectors` computed property extracting unique ministries from documents
- Included default sectors as fallback when no documents exist

### Step 2: Setup Component (Sector Step)
- Replaced hardcoded `sectors` array with computed `availableSectors` from state service
- Added helpful tooltip explaining dynamic sectors

### Step 3: Setup Component (Intent Step)
- Added "Other" option to intents array
- Added conditional input field that shows when "Other" is selected
- Added confirm/cancel buttons for custom intent input

### Step 4: Admin Component
- Normalized ministry names in `uploadDocument()` method using the new normalization function

