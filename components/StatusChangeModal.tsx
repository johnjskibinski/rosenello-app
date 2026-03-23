'use client';

import { useState } from 'react';

const STATUS_LABELS: Record<string, string> = {
  SN: 'Scope Needed',
  PU: 'Pending Upload',
  SS: 'Scheduled – Sales',
  MR: 'Measure Ready',
  D:  'Demo',
  B:  'Backorder',
  '1': 'Step 1',
  '2': 'Step 2',
  '3': 'Step 3',
  NS: 'Need to Schedule',
  SV: 'Service',
  S:  'Scheduled',
  '5': 'Step 5',
  T:  'Temporary',
  SI: 'Schedule Install',
  CM: 'Complete – Pending Money',
  U:  'Unpaid',
};

interface Props {
  jobId: number;
  currentStatus: string;
  customerName: string;
  onSuccess: (updatedJob: any) => void;
}

export function StatusChangeModal({ jobId, currentStatus, customerName, onSuccess }: Props) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = selectedStatus !== currentStatus;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: selectedStatus }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unknown error');
      onSuccess(json);
      setOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50"
      >
        Change Status
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Confirm Status Change</h2>

            <p className="text-sm text-gray-600">
              Job <span className="font-medium">#{jobId}</span> — {customerName}
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">New Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#036A43]"
              >
                {Object.entries(STATUS_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {code} — {label}
                  </option>
                ))}
              </select>
            </div>

            {isDirty && (
              <div className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-yellow-800">
                <span className="font-medium">{currentStatus}</span>
                {' → '}
                <span className="font-medium">{selectedStatus}</span>
                {' '}
                <span className="text-yellow-600">({STATUS_LABELS[selectedStatus]})</span>
                <p className="mt-1 text-xs">This will update both Lead Perfection and the production board.</p>
              </div>
            )}

            {error && (
              <div className="text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700">
                ⚠️ {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setOpen(false); setError(null); setSelectedStatus(currentStatus); }}
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !isDirty}
                className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: isDirty ? '#036A43' : '#6b7280' }}
              >
                {loading ? 'Updating…' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
