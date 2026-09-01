'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update' | 'force'>('skip');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const targetFields = [
    { key: 'name', label: 'Passenger Name *', required: true },
    { key: 'phone', label: 'Phone Number *', required: true },
    { key: 'email', label: 'Email Address' },
    { key: 'origin', label: 'Origin (Airport/City) *', required: true },
    { key: 'destination', label: 'Destination *', required: true },
    { key: 'travelDate', label: 'Travel Date' },
    { key: 'returnDate', label: 'Return Date' },
    { key: 'pax', label: 'Pax (Passengers)' },
    { key: 'airlineCharge', label: 'Airline Charge ($)' },
    { key: 'airlineConsolidatorCharge', label: 'Airline Consolidator Charge ($)' },
    { key: 'totalAmount', label: 'Total Amount ($)' },
    { key: 'source', label: 'Lead Source' },
    { key: 'stage', label: 'Initial Stage' },
    { key: 'pnr', label: 'PNR / Reference' },
    { key: 'notes', label: 'Notes' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setImportResult(null);

    const fileName = uploadedFile.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            setRawHeaders(results.meta.fields);
            setRawRows(results.data);
            autoMapColumns(results.meta.fields);
          }
        },
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length > 0) {
          const headers = (json[0] as string[]).map((h) => String(h || '').trim());
          const rows = json.slice(1).map((r) => {
            const obj: any = {};
            headers.forEach((h, idx) => {
              obj[h] = r[idx];
            });
            return obj;
          });

          setRawHeaders(headers);
          setRawRows(rows);
          autoMapColumns(headers);
        }
      };
      reader.readAsArrayBuffer(uploadedFile);
    }
  };

  const autoMapColumns = (headers: string[]) => {
    const mapping: Record<string, string> = {};
    headers.forEach((h) => {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.includes('name') || lower.includes('passenger') || lower.includes('client')) mapping.name = h;
      else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact')) mapping.phone = h;
      else if (lower.includes('email') || lower.includes('mail')) mapping.email = h;
      else if (lower.includes('origin') || lower.includes('from') || lower.includes('departure')) mapping.origin = h;
      else if (lower.includes('destination') || lower.includes('to') || lower.includes('arrival')) mapping.destination = h;
      else if (lower.includes('traveldate') || lower.includes('date') || lower.includes('depart')) mapping.travelDate = h;
      else if (lower.includes('returndate') || lower.includes('return')) mapping.returnDate = h;
      else if (lower.includes('pax') || lower.includes('passenger') || lower.includes('count')) mapping.pax = h;
      else if (lower.includes('consolidator')) mapping.airlineConsolidatorCharge = h;
      else if (lower.includes('airline') && (lower.includes('charge') || lower.includes('price') || lower.includes('fare'))) mapping.airlineCharge = h;
      else if (lower.includes('total') || lower.includes('price') || lower.includes('fare') || lower.includes('quote') || lower.includes('cost') || lower.includes('amount')) mapping.totalAmount = h;
      else if (lower.includes('source') || lower.includes('channel')) mapping.source = h;
      else if (lower.includes('stage') || lower.includes('status')) mapping.stage = h;
      else if (lower.includes('pnr') || lower.includes('reference')) mapping.pnr = h;
      else if (lower.includes('note') || lower.includes('comment') || lower.includes('remark')) mapping.notes = h;
    });
    setColumnMapping(mapping);
  };

  const handleExecuteImport = async () => {
    if (!columnMapping.name || !columnMapping.phone) {
      alert('Please map at least the Passenger Name and Phone columns before importing.');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    // Transform rawRows to standard CRM lead format
    const transformedRows = rawRows.map((raw) => {
      const row: any = {};
      Object.entries(columnMapping).forEach(([crmKey, rawHeader]) => {
        if (rawHeader && raw[rawHeader] !== undefined) {
          row[crmKey] = raw[rawHeader];
        }
      });
      return row;
    });

    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: transformedRows,
          duplicateHandling,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportResult(data.summary);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold font-display text-ember-text-primary">
            Import Flight Leads
          </h1>
          <p className="text-xs text-ember-text-secondary mt-0.5">
            Upload CSV or Excel spreadsheets with column mapping and automated duplicate phone detection.
          </p>
        </div>

        {/* Step 1: Upload File */}
        <Card elevated className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-ember-border">
            <div className="w-6 h-6 rounded-full bg-ember-primary text-white flex items-center justify-center text-xs font-bold">
              1
            </div>
            <h2 className="text-sm font-bold text-ember-text-primary">
              Choose Spreadsheet File (.CSV, .XLSX, .XLS)
            </h2>
          </div>

          <div className="border-2 border-dashed border-ember-border hover:border-ember-primary rounded-card p-8 text-center transition-colors bg-ember-surface/50">
            <FileSpreadsheet className="w-10 h-10 text-ember-neutral mx-auto mb-3" />
            <p className="text-sm font-bold text-ember-text-primary">
              {file ? file.name : 'Drag and drop your spreadsheet here, or browse'}
            </p>
            <p className="text-xs text-ember-neutral mt-1">
              {file
                ? `${rawRows.length} rows detected with ${rawHeaders.length} columns.`
                : 'Supports offline travel lead lists, ads exports, and flight inquiries.'}
            </p>
            <label className="mt-4 inline-block">
              <Button size="sm" variant="secondary" className="cursor-pointer">
                Select File
              </Button>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </Card>

        {/* Step 2: Column Mapping */}
        {rawHeaders.length > 0 && (
          <Card elevated className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-ember-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-ember-primary text-white flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <h2 className="text-sm font-bold text-ember-text-primary">
                  Map File Headers to CRM Fields
                </h2>
              </div>
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Auto-mapped {Object.keys(columnMapping).length} fields
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {targetFields.map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-ember-text-primary min-w-[140px]">
                    {field.label}
                  </span>
                  <select
                    value={columnMapping[field.key] || ''}
                    onChange={(e) =>
                      setColumnMapping({
                        ...columnMapping,
                        [field.key]: e.target.value,
                      })
                    }
                    className="w-full bg-ember-surface border border-ember-border rounded px-2.5 py-1.5 text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary"
                  >
                    <option value="">— Don't import —</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        Column: {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Duplicate Handling Option */}
            <div className="pt-4 border-t border-ember-border space-y-2">
              <span className="text-xs font-bold text-ember-text-primary uppercase tracking-wider block">
                Duplicate Phone Detection Policy
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 p-2.5 rounded-btn bg-ember-surface-raised border border-ember-border cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="duplicateHandling"
                    value="skip"
                    checked={duplicateHandling === 'skip'}
                    onChange={() => setDuplicateHandling('skip')}
                  />
                  <div>
                    <span className="font-bold text-ember-text-primary block">Skip Duplicates</span>
                    <span className="text-[10px] text-ember-neutral">Preserve existing lead untouched</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-btn bg-ember-surface-raised border border-ember-border cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="duplicateHandling"
                    value="update"
                    checked={duplicateHandling === 'update'}
                    onChange={() => setDuplicateHandling('update')}
                  />
                  <div>
                    <span className="font-bold text-ember-text-primary block">Update Existing</span>
                    <span className="text-[10px] text-ember-neutral">Update fields on matched phone</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-btn bg-ember-surface-raised border border-ember-border cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="duplicateHandling"
                    value="force"
                    checked={duplicateHandling === 'force'}
                    onChange={() => setDuplicateHandling('force')}
                  />
                  <div>
                    <span className="font-bold text-ember-text-primary block">Import Anyway</span>
                    <span className="text-[10px] text-ember-neutral">Create new duplicate entry</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button
                size="lg"
                isLoading={isImporting}
                onClick={handleExecuteImport}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Execute Import ({rawRows.length} rows)</span>
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Result Summary */}
        {importResult && (
          <Card elevated className="p-5 border-l-4 border-l-emerald-600 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-ember-text-primary">
                Import Process Completed!
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div className="p-2 rounded bg-ember-surface-raised">
                <span className="text-ember-neutral block">Processed</span>
                <span className="text-base font-bold text-ember-text-primary">
                  {importResult.totalProcessed}
                </span>
              </div>
              <div className="p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="block">Imported New</span>
                <span className="text-base font-bold">{importResult.importedCount}</span>
              </div>
              <div className="p-2 rounded bg-amber-50 text-amber-900 border border-amber-200">
                <span className="block">Skipped Dups</span>
                <span className="text-base font-bold">{importResult.skippedCount}</span>
              </div>
              <div className="p-2 rounded bg-blue-50 text-blue-900 border border-blue-200">
                <span className="block">Updated</span>
                <span className="text-base font-bold">{importResult.updatedCount}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={() => (window.location.href = '/leads')}>
                View Leads Pipeline &rarr;
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
