# Tax Command Design

Build a `/tax` command that reads PDF tax documents (W2, 1099, 1098) and generates a filled IRS 1040 PDF.

## Overview

**Goal:** Automate tax form data extraction and 1040 preparation

**Approach:**
1. Scan "tax" directory for PDF documents
2. Extract text from PDFs using pdf-parse
3. Use LLM to identify form types and extract structured data
4. Calculate tax values (income, deductions, tax owed)
5. Fill official IRS 1040 PDF template using pdf-lib

**Supported Forms:**
- W2 (wages, withholdings)
- 1099-NEC (freelance income)
- 1099-INT (interest income)
- 1098 (mortgage interest)

**Output:** Filled `1040-filled.pdf`

## File Structure

```
src/
├── commands/
│   └── tax.ts           # /tax command handler
├── tax/
│   ├── parser.ts        # PDF text extraction
│   ├── extractor.ts     # LLM-based data extraction
│   ├── calculator.ts    # Tax calculations
│   ├── filler.ts        # Fill 1040 PDF template
│   └── types.ts         # Tax data interfaces
assets/
└── f1040-template.pdf   # Blank IRS 1040 form
```

## Data Types

```typescript
// src/tax/types.ts

export interface W2Data {
  employer: string;
  wages: number;           // Box 1
  federalWithheld: number; // Box 2
  socialSecurityWages: number; // Box 3
  socialSecurityWithheld: number; // Box 4
  medicareWages: number;   // Box 5
  medicareWithheld: number; // Box 6
  stateWages: number;      // Box 16
  stateWithheld: number;   // Box 17
}

export interface Form1099NEC {
  payer: string;
  nonemployeeCompensation: number; // Box 1
}

export interface Form1099INT {
  payer: string;
  interestIncome: number; // Box 1
}

export interface Form1098 {
  lender: string;
  mortgageInterest: number; // Box 1
  propertyTax: number;      // Box 10 (if reported)
}

export interface TaxData {
  w2s: W2Data[];
  form1099necs: Form1099NEC[];
  form1099ints: Form1099INT[];
  form1098s: Form1098[];
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head_of_household';
}

export interface Form1040Result {
  totalIncome: number;
  adjustedGrossIncome: number;
  deductions: number;
  taxableIncome: number;
  totalTax: number;
  totalPayments: number;
  refundOrOwed: number;
}
```

## Extraction Flow

1. **Parse PDF** - Extract text using pdf-parse
2. **Identify Form Type** - LLM analyzes text to determine W2, 1099, etc.
3. **Extract Data** - LLM returns structured JSON with field values
4. **Validate** - Ensure required fields are present

```typescript
const prompt = `Extract data from this tax form.
Identify the form type (W2, 1099-NEC, 1099-INT, 1098).
Return JSON with the extracted values.

Form text:
${pdfText}`;
```

## Tax Calculation (2024 Rates)

```typescript
// Income
totalIncome = sum(W2 wages) + sum(1099-NEC) + sum(1099-INT)

// Self-employment tax deduction (half of SE tax)
seIncome = sum(1099-NEC) * 0.9235
seTax = seIncome * 0.153
seDeduction = seTax / 2

// AGI
adjustedGrossIncome = totalIncome - seDeduction

// Deductions
standardDeduction = {
  single: 14600,
  married_joint: 29200,
  married_separate: 14600,
  head_of_household: 21900
}
itemizedDeductions = sum(1098 mortgage interest) + sum(1098 property tax)
deductions = max(standardDeduction, itemizedDeductions)

// Tax
taxableIncome = AGI - deductions
tax = calculateBrackets(taxableIncome, filingStatus)
totalTax = tax + seTax

// Result
totalPayments = sum(W2 federal withheld)
refundOrOwed = totalPayments - totalTax
```

## PDF Form Filling

```typescript
import { PDFDocument } from 'pdf-lib';

export async function fill1040(data: Form1040Result, taxData: TaxData): Promise<Uint8Array> {
  const templateBytes = await fs.readFile('assets/f1040-template.pdf');
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm();

  // Map data to IRS field names
  form.getTextField('topmostSubform[0].Page1[0].f1_04[0]').setText(data.totalIncome.toString());
  // ... continue mapping

  form.flatten();
  return pdf.save();
}
```

## User Experience

```
> /tax

Scanning tax directory...
Found 4 documents:
  - w2-acme-corp.pdf
  - 1099-nec-freelance.pdf
  - 1098-mortgage.pdf
  - 1099-int-bank.pdf

Extracting data...
  ✓ W2: Acme Corp - $75,000 wages, $12,000 withheld
  ✓ 1099-NEC: Freelance Inc - $15,000
  ✓ 1098: First Bank - $8,500 mortgage interest
  ✓ 1099-INT: Local Bank - $250 interest

Filing status? (single/married_joint/married_separate/head_of_household)
> married_joint

Calculating...
  Total Income: $90,250
  Adjusted Gross Income: $89,102
  Deductions: $29,200 (standard)
  Taxable Income: $59,902
  Tax Owed: $6,789
  Total Payments: $12,000

  REFUND: $5,211

✓ Saved: 1040-filled.pdf

Review the form before filing!
```

## Dependencies

```json
{
  "pdf-parse": "^1.1.1",
  "pdf-lib": "^1.17.1"
}
```

## Integration Points

- Add `/tax` to command handler in `src/cli/commands.ts`
- Add `tax` to help text
- Uses existing provider for LLM extraction
