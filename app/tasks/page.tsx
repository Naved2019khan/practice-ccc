'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Plus,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Trash2,
  Plane,
  Mail,
  User,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Avatar } from '@/components/ui/Avatar';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [leadsList, setLeadsList] = useState<any[]>([]);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'In Progress' | 'Completed'>('All');
  const [filterPriority, setFilterPriority] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    leadId: '',
    assignedTo: '',
    priority: 'Medium',
    dueDate: '',
    sendEmailAlert: true,
  });

  const fetchTasksData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
        if (meData.user?.role === 'admin') {
          const sRes = await fetch('/api/staff');
          if (sRes.ok) {
            const sData = await sRes.json();
            setStaffList(sData.staff || []);
          }
        }
      }

      const tasksRes = await fetch('/api/tasks');
      if (tasksRes.ok) {
        const tData = await tasksRes.json();
        setTasks(tData.tasks || []);
      }

      const leadsRes = await fetch('/api/leads');
      if (leadsRes.ok) {
        const lData = await leadsRes.json();
        setLeadsList(lData.leads || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksData();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create task');
      }

      setIsModalOpen(false);
      setForm({
        title: '',
        description: '',
        leadId: '',
        assignedTo: '',
        priority: 'Medium',
        dueDate: '',
        sendEmailAlert: true,
      });
      fetchTasksData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (task: any) => {
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? { ...t, status: nextStatus } : t))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus !== 'All' && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-ember-text-primary">
              Tasks & Follow-up Todos
            </h1>
            <p className="text-xs text-ember-text-secondary mt-0.5">
              Track client call reminders, fare holds, and ticketing tasks with automated email notifications.
            </p>
          </div>

          <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Create New Task</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-ember-surface border border-ember-border rounded-card text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ember-neutral">Status:</span>
            {(['All', 'Pending', 'In Progress', 'Completed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-chip font-bold transition-colors ${
                  filterStatus === st
                    ? 'bg-ember-primary text-white'
                    : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-ember-neutral">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-ember-surface-raised border border-ember-border rounded px-2.5 py-1 text-xs text-ember-text-primary focus:outline-none focus:border-ember-primary"
            >
              <option value="">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <Card className="text-center py-12">
              <CheckSquare className="w-8 h-8 text-ember-neutral/40 mx-auto mb-2" />
              <p className="font-bold text-sm text-ember-text-primary">No tasks found</p>
              <p className="text-xs text-ember-neutral mt-0.5">
                All scheduled follow-up tasks and todos are complete.
              </p>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const isOverdue =
                new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0) &&
                task.status !== 'Completed';

              return (
                <Card
                  key={task._id}
                  elevated
                  className={`p-4 transition-all ${
                    task.status === 'Completed'
                      ? 'opacity-70 bg-stone-100 border-stone-200'
                      : isOverdue
                      ? 'border-l-4 border-l-red-600'
                      : 'border-l-4 border-l-amber-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Checkbox + Title */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={task.status === 'Completed'}
                        onChange={() => handleToggleStatus(task)}
                        className="mt-1 w-4 h-4 rounded text-ember-primary focus:ring-ember-primary cursor-pointer"
                      />
                      <div className="min-w-0">
                        <h3
                          className={`text-sm font-bold ${
                            task.status === 'Completed'
                              ? 'line-through text-stone-500'
                              : 'text-ember-text-primary'
                          }`}
                        >
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-xs text-ember-text-secondary mt-0.5 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Associated Lead Link */}
                        {task.leadId && (
                          <Link
                            href={`/leads/${task.leadId._id}`}
                            className="inline-flex items-center gap-1.5 text-xs text-ember-primary hover:underline font-semibold mt-2"
                          >
                            <Plane className="w-3.5 h-3.5" />
                            <span>
                              Lead: {task.leadId.name} ({task.leadId.origin} &rarr; {task.leadId.destination})
                            </span>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Right: Meta & Badges */}
                    <div className="flex flex-col items-end gap-2 shrink-0 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-chip text-[10px] font-bold ${
                            task.priority === 'High'
                              ? 'bg-red-100 text-red-800'
                              : task.priority === 'Medium'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {task.priority} Priority
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-chip text-[10px] font-bold ${
                            task.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-800'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-ember-neutral text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        {task.assignedTo && (
                          <span className="font-semibold text-ember-text-primary">
                            &bull; {task.assignedTo.name}
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteTask(task._id)}
                          className="p-1 text-ember-neutral hover:text-ember-error rounded"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Modal: Create Task */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create Follow-Up Task / Todo"
          description="Assign follow-up reminders. When enabled, email notification is dispatched via SES or Gmail."
          maxWidth="lg"
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <Input
              label="Task Title *"
              placeholder="e.g. Call James Thornton to confirm ticket issuance"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />

            <Textarea
              label="Task Details / Notes"
              placeholder="e.g. Confirm seat allocation in Premium Economy and verify passport expiration date."
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select
                label="Associate with Lead (Optional)"
                value={form.leadId}
                onChange={(e) => setForm({ ...form, leadId: e.target.value })}
              >
                <option value="">— None (General CRM Task) —</option>
                {leadsList.map((lead) => (
                  <option key={lead._id} value={lead._id}>
                    {lead.name} ({lead.origin} → {lead.destination})
                  </option>
                ))}
              </Select>

              {currentUser?.role === 'admin' ? (
                <Select
                  label="Assign to Staff"
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                >
                  <option value="">Assign to Me ({currentUser?.name})</option>
                  {staffList
                    .filter((s) => s.active)
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                </Select>
              ) : (
                <div className="text-xs text-ember-neutral pt-6">
                  <span>Assigning to yourself ({currentUser?.name})</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Due Date *"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                required
              />

              <Select
                label="Priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </Select>
            </div>

            {/* Email alert checkbox */}
            <div className="flex items-center gap-2 p-3 bg-ember-surface-raised rounded-btn border border-ember-border">
              <input
                type="checkbox"
                id="sendAlert"
                checked={form.sendEmailAlert}
                onChange={(e) => setForm({ ...form, sendEmailAlert: e.target.checked })}
                className="w-4 h-4 rounded text-ember-primary focus:ring-ember-primary"
              />
              <div>
                <label htmlFor="sendAlert" className="text-xs font-bold text-ember-text-primary block cursor-pointer">
                  Send Email Notification to Staff
                </label>
                <span className="text-[11px] text-ember-neutral">
                  Dispatches task details immediately via configured AWS SES or Gmail SMTP.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-ember-border">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Create Task
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
