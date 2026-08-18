'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Shield,
  UserCheck,
  CheckCircle2,
  XCircle,
  Edit2,
  Key,
  Phone,
  Mail,
  Plane,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';

export default function StaffPage() {
  const router = useRouter();
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    active: true,
    phone: '',
  });

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff');
      if (!res.ok) {
        if (res.status === 403) {
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to fetch staff');
      }
      const data = await res.json();
      setStaffMembers(data.staff || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'staff',
      active: true,
      phone: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: any) => {
    setEditingStaff(staff);
    setForm({
      name: staff.name,
      email: staff.email,
      password: '', // blank unless resetting
      role: staff.role,
      active: staff.active,
      phone: staff.phone || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingStaff ? `/api/staff/${editingStaff._id}` : '/api/staff';
      const method = editingStaff ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save staff');
      }

      setIsModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (staff: any) => {
    try {
      const res = await fetch(`/api/staff/${staff._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !staff.active }),
      });
      if (res.ok) {
        fetchStaff();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-ember-primary" />
              <h1 className="text-2xl font-bold font-display text-ember-text-primary">
                Staff Team Management
              </h1>
            </div>
            <p className="text-xs text-ember-text-secondary mt-0.5">
              Admin-only control: Add, configure, and deactivate staff agent accounts. No public registration.
            </p>
          </div>

          <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Add New Staff Account</span>
          </Button>
        </div>

        {/* Staff Table / Cards */}
        <Card className="p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-ember-surface-raised border-b border-ember-border text-ember-text-secondary uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status & Auto-Assign</th>
                  <th className="py-3.5 px-4 text-center">Assigned Leads</th>
                  <th className="py-3.5 px-4 text-center">Active Leads</th>
                  <th className="py-3.5 px-4 text-center">Ticketed Won</th>
                  <th className="py-3.5 px-4 text-center">Win Rate</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ember-border bg-ember-surface">
                {staffMembers.map((staff) => (
                  <tr key={staff._id} className="hover:bg-ember-surface-raised/60 transition-colors">
                    {/* User info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={staff.name} src={staff.avatar} size="md" />
                        <div>
                          <p className="font-bold text-ember-text-primary">{staff.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-ember-neutral mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {staff.email}
                            </span>
                            {staff.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {staff.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      {staff.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-ember-primary/10 text-ember-primary border border-ember-primary/20">
                          <Shield className="w-3 h-3" /> Administrator
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                          <UserCheck className="w-3 h-3" /> Staff Agent
                        </span>
                      )}
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(staff)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip text-xs font-semibold transition-colors cursor-pointer ${
                          staff.active
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-stone-200 text-stone-600 border border-stone-300 hover:bg-stone-300'
                        }`}
                        title="Click to toggle active state"
                      >
                        {staff.active ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            <span>Active (In Round-Robin)</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-stone-400" />
                            <span>Deactivated</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Stats */}
                    <td className="py-3.5 px-4 text-center font-bold text-ember-text-primary">
                      {staff.totalLeads}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-700">
                      {staff.activeLeads}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                      {staff.ticketedLeads}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-ember-text-primary">
                      {staff.conversionRate}%
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenEdit(staff)}
                        className="gap-1 text-xs px-2.5 py-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal: Create / Edit Staff */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingStaff ? `Edit Staff Account (${editingStaff.name})` : 'Create New Staff Account'}
          description="Staff accounts have access to manage their assigned flight leads."
          maxWidth="md"
        >
          <form onSubmit={handleSaveStaff} className="space-y-4">
            <Input
              label="Full Name *"
              placeholder="e.g. Sarah Jenkins"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <Input
              label="Email Address *"
              type="email"
              placeholder="sarah.agent@flightcrm.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <Input
              label={editingStaff ? 'Reset Password (Leave blank to keep existing)' : 'Password *'}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editingStaff}
            />

            <Input
              label="Phone Number"
              placeholder="+1 (555) 123-4567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="staff">Staff Agent</option>
                <option value="admin">Administrator</option>
              </Select>

              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-xs font-semibold text-ember-text-primary">Status</label>
                <label className="flex items-center gap-2 pt-2 text-xs font-semibold text-ember-text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="rounded text-ember-primary"
                  />
                  <span>Active Account</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-ember-border">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingStaff ? 'Save Changes' : 'Create Staff Account'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
