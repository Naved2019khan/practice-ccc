'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, UserSession } from './Sidebar';
import { Navbar } from './Navbar';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';

export interface AppLayoutProps {
  children: React.ReactNode;
  onSearchChange?: (val: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, onSearchChange }) => {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);

  // New Lead Form State
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Website',
    origin: '',
    destination: '',
    travelDate: '',
    returnDate: '',
    pax: 1,
    tripType: 'Round Trip',
    stage: 'New',
    assignedTo: '',
    paymentStatus: 'Pending',
    priceQuoted: '',
    nextFollowUpDate: '',
    initialNote: '',
  });

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);

      // If admin, fetch staff for assignment dropdown
      if (data.user?.role === 'admin') {
        const staffRes = await fetch('/api/staff');
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          setStaffList(staffData.staff || []);
        }
      }
    } catch (e) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeadForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create lead');
      }

      setIsNewLeadModalOpen(false);
      // Reset form
      setNewLeadForm({
        name: '',
        phone: '',
        email: '',
        source: 'Website',
        origin: '',
        destination: '',
        travelDate: '',
        returnDate: '',
        pax: 1,
        tripType: 'Round Trip',
        stage: 'New',
        assignedTo: '',
        paymentStatus: 'Pending',
        priceQuoted: '',
        nextFollowUpDate: '',
        initialNote: '',
      });

      // Refresh current route to show new lead
      router.refresh();
      if (window.location.pathname === '/leads' || window.location.pathname === '/dashboard') {
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ember-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-ember-primary border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-ember-neutral">Loading Ember CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-ember-bg">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onSearchChange={onSearchChange}
          onNewLeadClick={() => setIsNewLeadModalOpen(true)}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Global Manual Add Lead Modal */}
      <Modal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        title="Add New Flight Lead"
        description="Enter passenger flight requirements. If unassigned and auto-assign is on, it will be round-robined."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Passenger Name *"
              placeholder="e.g. John Doe"
              value={newLeadForm.name}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
              required
            />
            <Input
              label="Phone Number *"
              placeholder="e.g. +1 555 123 4567"
              value={newLeadForm.phone}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="john@example.com"
              value={newLeadForm.email}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
            />
            <Select
              label="Lead Source"
              value={newLeadForm.source}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
            >
              <option value="Website">Website</option>
              <option value="Contact Us">Contact Us</option>
              <option value="Referral">Referral</option>
              <option value="Phone">Phone Inquiry</option>
              <option value="Ads">Meta / Google Ads</option>
              <option value="Newsletter">Newsletter</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Origin (Airport / City) *"
              placeholder="e.g. JFK (New York)"
              value={newLeadForm.origin}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, origin: e.target.value })}
              required
            />
            <Input
              label="Destination (Airport / City) *"
              placeholder="e.g. LHR (London)"
              value={newLeadForm.destination}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, destination: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Travel Date"
              type="date"
              value={newLeadForm.travelDate}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, travelDate: e.target.value })}
            />
            <Input
              label="Return Date"
              type="date"
              value={newLeadForm.returnDate}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, returnDate: e.target.value })}
            />
            <Input
              label="Pax (Passengers)"
              type="number"
              min="1"
              value={newLeadForm.pax}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, pax: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              label="Trip Type"
              value={newLeadForm.tripType}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, tripType: e.target.value as any })}
            >
              <option value="Round Trip">Round Trip</option>
              <option value="One Way">One Way</option>
              <option value="Multi-City">Multi-City</option>
            </Select>

            <Select
              label="Initial Stage"
              value={newLeadForm.stage}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, stage: e.target.value as any })}
            >
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Quoted">Quoted</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Booked">Booked</option>
              <option value="Ticketed">Ticketed</option>
            </Select>

            <Input
              label="Quoted Price ($)"
              type="number"
              placeholder="e.g. 1450"
              value={newLeadForm.priceQuoted}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, priceQuoted: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Next Follow-Up Date"
              type="date"
              value={newLeadForm.nextFollowUpDate}
              onChange={(e) => setNewLeadForm({ ...newLeadForm, nextFollowUpDate: e.target.value })}
            />

            {user?.role === 'admin' ? (
              <Select
                label="Assign to Staff"
                value={newLeadForm.assignedTo}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, assignedTo: e.target.value })}
              >
                <option value="">Auto-Assign (Round-Robin)</option>
                {staffList
                  .filter((s) => s.active)
                  .map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name} ({staff.email})
                    </option>
                  ))}
              </Select>
            ) : (
              <div className="text-xs text-ember-neutral flex items-center pt-6">
                <span>Assigned to you ({user?.name})</span>
              </div>
            )}
          </div>

          <Textarea
            label="Initial Flight Note / Request"
            placeholder="e.g. Prefers direct flight, premium economy, flexible on +/- 2 days."
            rows={2}
            value={newLeadForm.initialNote}
            onChange={(e) => setNewLeadForm({ ...newLeadForm, initialNote: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-ember-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsNewLeadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Flight Lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
