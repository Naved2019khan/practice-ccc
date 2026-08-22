'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Eye, Copy, Sparkles, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setForm({
      name: '',
      category: 'Quotation',
      subject: 'Flight Options for {{origin}} to {{destination}} — Ember Flight Concierge',
      bodyHtml: `<div style="font-family: 'Source Sans 3', sans-serif, Arial; color: #1C1917; max-width: 600px; margin: 0 auto; background: #FAFAF9; padding: 24px; border: 1px solid #D6D3D1; border-radius: 12px;">
  <h2 style="color: #C2410C; margin: 0 0 16px 0;">Flight Itinerary Quote</h2>
  <p>Dear <strong>{{name}}</strong>,</p>
  <p>Here are your flight details for <strong>{{origin}}</strong> to <strong>{{destination}}</strong> departing on <strong>{{travel_date}}</strong>:</p>
  <div style="background: #F5F5F4; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p><strong>Passengers:</strong> {{pax}}</p>
    <p><strong>Total Quoted Fare:</strong> \${{price}}</p>
  </div>
  <p>Best regards,<br><strong>{{agent_name}}</strong></p>
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

  const placeholders = [
    { tag: '{{name}}', desc: 'Passenger Full Name' },
    { tag: '{{origin}}', desc: 'Departure Airport / City' },
    { tag: '{{destination}}', desc: 'Arrival Airport / City' },
    { tag: '{{travel_date}}', desc: 'Formatted Departure Date' },
    { tag: '{{pax}}', desc: 'Number of Passengers' },
    { tag: '{{price}}', desc: 'Quoted Ticket Fare' },
    { tag: '{{pnr}}', desc: 'Airline PNR Code' },
    { tag: '{{invoice_number}}', desc: 'Invoice Number' },
    { tag: '{{agent_name}}', desc: 'Assigned Agent Name' },
    { tag: '{{company_name}}', desc: 'Company / Concierge Name' },
  ];

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
              Manage pre-designed flight quotes, urgent follow-ups, and ticket confirmation emails.
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
                <p className="text-xs text-ember-text-secondary line-clamp-1">
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
                    className="p-1 rounded text-ember-neutral hover:text-ember-text-primary hover:bg-ember-surface-raised"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(tmpl._id)}
                    className="p-1 rounded text-ember-neutral hover:text-ember-error hover:bg-ember-surface-raised"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Placeholder Variable Cheat Sheet */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-ember-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ember-text-primary">
              Template Dynamic Placeholders Reference
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {placeholders.map((p) => (
              <div key={p.tag} className="p-2 rounded bg-ember-surface-raised text-xs space-y-0.5">
                <code className="font-code font-bold text-ember-primary text-[11px] block">
                  {p.tag}
                </code>
                <span className="text-[10px] text-ember-neutral">{p.desc}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Editor Modal */}
        <Modal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          title={editingTemplate ? 'Edit Email Template' : 'Create New Email Template'}
          description="Craft rich HTML email templates with dynamic passenger variables."
          maxWidth="3xl"
        >
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Template Name *"
                placeholder="e.g. Flight Quotation (Round Trip)"
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
              placeholder="Flight details for {{origin}} to {{destination}}..."
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ember-text-primary">
                HTML Body Content *
              </label>
              <textarea
                rows={10}
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
            maxWidth="2xl"
          >
            <div className="p-4 bg-white rounded-card border border-ember-border overflow-y-auto max-h-[60vh]">
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
