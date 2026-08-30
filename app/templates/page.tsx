'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Eye,
  Copy,
  Check,
  Sparkles,
  CheckCircle2,
  Plane,
  CreditCard,
  User,
  Building2,
  Compass,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

interface PlaceholderGroup {
  category: string;
  icon: any;
  items: Array<{ tag: string; desc: string }>;
}

const PLACEHOLDER_GROUPS: PlaceholderGroup[] = [
  {
    category: 'Passenger Information',
    icon: User,
    items: [
      { tag: '{{name}}', desc: 'Passenger Full Name' },
      { tag: '{{email}}', desc: 'Passenger Email Address' },
      { tag: '{{phone}}', desc: 'Passenger Phone Number' },
      { tag: '{{gender}}', desc: 'Passenger Gender' },
    ],
  },
  {
    category: 'Booking & References',
    icon: FileText,
    items: [
      { tag: '{{booking_reference}}', desc: 'Booking Reference / Agreement ID' },
      { tag: '{{date_booked}}', desc: 'Date of Booking Creation' },
      { tag: '{{pnr}}', desc: 'Airline PNR Code' },
      { tag: '{{invoice_number}}', desc: 'Invoice Number' },
      { tag: '{{ticket_number}}', desc: 'E-Ticket Number' },
    ],
  },
  {
    category: 'Itinerary Overview',
    icon: Compass,
    items: [
      { tag: '{{origin}}', desc: 'Departure Airport / City' },
      { tag: '{{destination}}', desc: 'Arrival Airport / City' },
      { tag: '{{travel_date}}', desc: 'Formatted Departure Date' },
      { tag: '{{return_date}}', desc: 'Formatted Return Date' },
      { tag: '{{pax}}', desc: 'Number of Passengers' },
      { tag: '{{trip_type}}', desc: 'Trip Type (Round Trip / One Way)' },
    ],
  },
  {
    category: 'Flight Leg 1 (Outbound)',
    icon: Plane,
    items: [
      { tag: '{{flight1_airline}}', desc: 'Outbound Airline Name' },
      { tag: '{{flight1_number}}', desc: 'Flight Number (e.g. DL 2638)' },
      { tag: '{{flight1_class}}', desc: 'Cabin Class (Economy, Business)' },
      { tag: '{{flight1_dep_airport}}', desc: 'Outbound Departure Airport' },
      { tag: '{{flight1_dep_city}}', desc: 'Outbound Departure City' },
      { tag: '{{flight1_dep_datetime}}', desc: 'Outbound Departure Date & Time' },
      { tag: '{{flight1_arr_airport}}', desc: 'Outbound Arrival Airport' },
      { tag: '{{flight1_arr_city}}', desc: 'Outbound Arrival City' },
      { tag: '{{flight1_arr_datetime}}', desc: 'Outbound Arrival Date & Time' },
    ],
  },
  {
    category: 'Flight Leg 2 (Return / Connecting)',
    icon: Plane,
    items: [
      { tag: '{{flight2_airline}}', desc: 'Return Airline Name' },
      { tag: '{{flight2_number}}', desc: 'Return Flight Number' },
      { tag: '{{flight2_class}}', desc: 'Return Cabin Class' },
      { tag: '{{flight2_dep_airport}}', desc: 'Return Departure Airport' },
      { tag: '{{flight2_dep_city}}', desc: 'Return Departure City' },
      { tag: '{{flight2_dep_datetime}}', desc: 'Return Departure Date & Time' },
      { tag: '{{flight2_arr_airport}}', desc: 'Return Arrival Airport' },
      { tag: '{{flight2_arr_city}}', desc: 'Return Arrival City' },
      { tag: '{{flight2_arr_datetime}}', desc: 'Return Arrival Date & Time' },
    ],
  },
  {
    category: 'Pricing & Payment Authorization',
    icon: CreditCard,
    items: [
      { tag: '{{price}}', desc: 'Total Booking Amount / Quoted Fare' },
      { tag: '{{currency}}', desc: 'Currency Code (e.g. USD)' },
      { tag: '{{card_brand}}', desc: 'Credit Card Brand (Visa, MC, etc.)' },
      { tag: '{{card_holder_name}}', desc: 'Cardholder Full Name' },
      { tag: '{{card_last4}}', desc: 'Card Last 4 Digits' },
      { tag: '{{billing_address}}', desc: 'Complete Billing Address' },
    ],
  },
  {
    category: 'Agent, Concierge & Portal',
    icon: Building2,
    items: [
      { tag: '{{agent_name}}', desc: 'Assigned Specialist Name' },
      { tag: '{{agent_email}}', desc: 'Agent Direct Email' },
      { tag: '{{agent_phone}}', desc: 'Agent Direct Phone' },
      { tag: '{{company_name}}', desc: 'Company / Concierge Brand Name' },
      { tag: '{{company_phone}}', desc: 'Toll-Free Customer Support Phone' },
      { tag: '{{company_domain}}', desc: 'Website Domain Name' },
      { tag: '{{portal_link}}', desc: 'Customer Online Tracking Portal URL' },
    ],
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');

  // Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);

  const [form, setForm] = useState({
    name: '',
    category: 'Quotation',
    subject: '',
    bodyHtml: '',
  });

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1800);
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setForm({
      name: '',
      category: 'Quotation',
      subject: 'Flight Options for {{origin}} to {{destination}} — {{company_name}}',
      bodyHtml: `<div style="font-family: Arial, Helvetica, sans-serif; color: #1C1917; max-width: 600px; margin: 0 auto; background: #FAFAF9; padding: 24px; border: 1px solid #D6D3D1; border-radius: 12px;">
  <h2 style="color: #C2410C; margin: 0 0 16px 0;">Flight Itinerary Quote</h2>
  <p>Dear <strong>{{name}}</strong>,</p>
  <p>Here are your flight details for <strong>{{origin}}</strong> to <strong>{{destination}}</strong> departing on <strong>{{travel_date}}</strong>:</p>
  <div style="background: #F5F5F4; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 4px 0;"><strong>Flight:</strong> {{flight1_airline}} {{flight1_number}}</p>
    <p style="margin: 4px 0;"><strong>Passengers:</strong> {{pax}}</p>
    <p style="margin: 4px 0;"><strong>Total Quoted Fare:</strong> {{currency}} {{price}}</p>
    <p style="margin: 4px 0;"><strong>Booking Ref:</strong> {{booking_reference}}</p>
  </div>
  <p>Best regards,<br><strong>{{agent_name}}</strong><br>{{company_name}}</p>
</div>`,
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (tmpl: any) => {
    setEditingTemplate(tmpl);
    setForm({
      name: tmpl.name,
      category: tmpl.category,
      subject: tmpl.subject,
      bodyHtml: tmpl.bodyHtml,
    });
    setIsEditorOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTemplate ? `/api/templates/${editingTemplate._id}` : '/api/templates';
      const method = editingTemplate ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setIsEditorOpen(false);
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredGroups =
    activeCategoryFilter === 'All'
      ? PLACEHOLDER_GROUPS
      : PLACEHOLDER_GROUPS.filter((g) => g.category.toLowerCase().includes(activeCategoryFilter.toLowerCase()));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-ember-text-primary">
              HTML Email Templates
            </h1>
            <p className="text-xs text-ember-text-secondary mt-0.5">
              Manage flight quotations, booking confirmations, payment authorization agreements, and follow-ups.
            </p>
          </div>

          <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Create New Template</span>
          </Button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <Card key={tmpl._id} elevated className="p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-ember-primary/10 text-ember-primary">
                    {tmpl.category}
                  </span>
                  <span className="text-[11px] text-ember-neutral">
                    {new Date(tmpl.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-ember-text-primary font-display">
                  {tmpl.name}
                </h3>
                <p className="text-xs text-ember-text-secondary line-clamp-2">
                  <strong>Subject:</strong> {tmpl.subject}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-ember-border text-xs">
                <button
                  onClick={() => setPreviewTemplate(tmpl)}
                  className="flex items-center gap-1 text-ember-primary hover:underline font-semibold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(tmpl)}
                    className="p-1.5 rounded text-ember-neutral hover:text-ember-text-primary hover:bg-ember-surface-raised"
                    title="Edit Template"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Dynamic Placeholders Cheat Sheet */}
        <Card className="p-5 space-y-4 border border-ember-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-ember-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-ember-primary/10 text-ember-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ember-text-primary">
                  Dynamic Template Placeholders Reference
                </h3>
                <p className="text-[11px] text-ember-text-secondary">
                  Click any placeholder tag to copy it to your clipboard. Placeholders are auto-substituted when emails are generated.
                </p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1">
              {['All', 'Passenger', 'Booking', 'Itinerary', 'Flight', 'Payment', 'Agent'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-colors ${
                    activeCategoryFilter === cat
                      ? 'bg-ember-primary text-white'
                      : 'bg-ember-surface-raised text-ember-neutral hover:text-ember-text-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Placeholders by Category */}
          <div className="space-y-4">
            {filteredGroups.map((group) => {
              const IconComponent = group.icon;
              return (
                <div key={group.category} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ember-text-primary">
                    <IconComponent className="w-3.5 h-3.5 text-ember-primary" />
                    <span>{group.category}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {group.items.map((item) => {
                      const isCopied = copiedTag === item.tag;
                      return (
                        <div
                          key={item.tag}
                          onClick={() => handleCopyTag(item.tag)}
                          className={`p-2.5 rounded-btn border text-xs cursor-pointer transition-all flex items-center justify-between group ${
                            isCopied
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                              : 'bg-ember-surface-raised border-ember-border hover:border-ember-primary hover:bg-white'
                          }`}
                          title="Click to copy placeholder tag"
                        >
                          <div className="min-w-0 pr-2">
                            <code className="font-code font-bold text-ember-primary text-[11px] block truncate">
                              {item.tag}
                            </code>
                            <span className="text-[10px] text-ember-neutral group-hover:text-ember-text-secondary block truncate">
                              {item.desc}
                            </span>
                          </div>

                          <div className="shrink-0">
                            {isCopied ? (
                              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Copied
                              </span>
                            ) : (
                              <Copy className="w-3 h-3 text-ember-neutral opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Editor Modal */}
        <Modal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          title={editingTemplate ? 'Edit Email Template' : 'Create New Email Template'}
          description="Craft rich HTML email templates with dynamic passenger and booking placeholders."
          maxWidth="3xl"
        >
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Template Name *"
                placeholder="e.g. Booking Confirmation & Payment Authorization"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="Quotation">Quotation</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Ticket Confirmation">Ticket Confirmation</option>
                <option value="Inquiry">Inquiry</option>
                <option value="General">General</option>
              </Select>
            </div>

            <Input
              label="Subject Line *"
              placeholder="Flight details for {{origin}} to {{destination}} (Ref: {{booking_reference}})..."
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ember-text-primary">
                HTML Body Content *
              </label>
              <textarea
                rows={12}
                value={form.bodyHtml}
                onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
                className="w-full bg-stone-900 text-stone-100 font-code text-xs p-3 rounded-input border border-stone-700 focus:outline-none focus:border-ember-primary"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-ember-border">
              <Button type="button" variant="secondary" onClick={() => setIsEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Template</Button>
            </div>
          </form>
        </Modal>

        {/* Live Preview Modal */}
        {previewTemplate && (
          <Modal
            isOpen={!!previewTemplate}
            onClose={() => setPreviewTemplate(null)}
            title={`Preview: ${previewTemplate.name}`}
            description={`Subject: ${previewTemplate.subject}`}
            maxWidth="3xl"
          >
            <div className="p-4 bg-white rounded-card border border-ember-border overflow-y-auto max-h-[65vh] shadow-inner">
              <div dangerouslySetInnerHTML={{ __html: previewTemplate.bodyHtml }} />
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setPreviewTemplate(null)}>Close Preview</Button>
            </div>
          </Modal>
        )}
      </div>
    </AppLayout>
  );
}
