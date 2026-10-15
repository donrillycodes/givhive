"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { safetyApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type Report = {
  id: string; targetType: string; targetId: string; ngoId: string;
  reason: string; details: string; status: string; createdAt: string;
  snapshot: Record<string, unknown>; resolution: string | null;
};

export function SafetyReports() {
  const client = useQueryClient();
  const { isSuperAdmin, can } = useAuth();
  const [status, setStatus] = useState('OPEN');
  const [page, setPage] = useState(1);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const reports = useQuery({ queryKey: ['safety-reports', status, page], queryFn: async () => {
    const response = await safetyApi.reports({ status, page });
    return response.data.data as { items: Report[]; total: number; totalPages: number };
  } });
  const review = useMutation({ mutationFn: ({ id, action }: { id: string; action: string }) => safetyApi.review(id, action, notes[id] ?? ''),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['safety-reports'] });
      void client.invalidateQueries({ queryKey: ['admin-content'] });
    } });
  return (
    <section className="rounded-xl border border-border-subtle bg-white p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-3 items-center">
        <h2 className="text-xl font-semibold">Donor safety reports</h2>
        <button className="text-sm underline disabled:opacity-40" disabled={reports.isFetching} onClick={() => { review.reset(); void reports.refetch(); }}>Refresh reports</button>
      </div>
      <p className="text-sm text-ink-muted">Review the oldest reports first. Report text and evidence are private. Use user management for abusive individual accounts; organisation suspension hides the organisation&apos;s public content.</p>
      <label className="text-sm">Status{' '}
        <select value={status} className="border border-border-subtle rounded p-2" onChange={e => { setStatus(e.target.value); setPage(1); review.reset(); }}>
          <option value="OPEN">Open</option><option value="RESOLVED">Resolved</option><option value="DISMISSED">Dismissed</option>
        </select>
      </label>
      {reports.isPending ? <p>Loading reports…</p> : reports.isError ? <button className="underline" onClick={() => { void reports.refetch(); }}>Could not load reports. Retry</button> : <>
        <p className="text-sm">{reports.data.total} {status.toLowerCase()} reports</p>
        {reports.data.items.map(report => (
          <article key={report.id} className="border border-border-subtle rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">{report.targetType.replaceAll('_', ' ')} · {report.reason.replaceAll('_', ' ')}</h3>
            <p className="text-xs text-ink-muted break-all">{new Date(report.createdAt).toLocaleString()} · Reference {report.targetId} · Organisation {report.ngoId}</p>
            <p className="whitespace-pre-wrap break-words">{report.details}</p>
            <details><summary className="cursor-pointer text-sm underline">Content saved when reported</summary>
              <pre className="text-xs whitespace-pre-wrap break-all bg-gray-50 p-3 mt-2">{JSON.stringify(report.snapshot, null, 2)}</pre>
            </details>
            {report.status === 'OPEN' ? <>
              <label className="block text-sm">Review notes
                <textarea className="block w-full border border-border-default rounded p-2 mt-1" rows={3} maxLength={1000} value={notes[report.id] ?? ''} onChange={e => setNotes(current => ({ ...current, [report.id]: e.target.value }))} placeholder="Explain your action (5–1000 characters)" />
              </label>
              <div className="flex flex-wrap gap-3 text-sm">
                {(['REMOVE_CONTENT', 'RESOLVE', 'DISMISS'] as const).map(action => (
                  <button key={action} className="border border-border-subtle rounded px-3 py-2 disabled:opacity-40" disabled={review.isPending || (notes[report.id]?.trim().length ?? 0) < 5 || (action === 'REMOVE_CONTENT' && report.targetType === 'NGO' && !isSuperAdmin && !can.approveNgos)} onClick={() => {
                    if (action === 'REMOVE_CONTENT' && !window.confirm(report.targetType === 'NGO' ? 'Suspend this organisation and hide its public content? Existing pledges remain.' : 'Hide this content from public browsing? Existing pledges remain.')) return;
                    review.mutate({ id: report.id, action });
                  }}>
                    {action === 'REMOVE_CONTENT' ? report.targetType === 'NGO' ? 'Suspend organisation' : 'Hide content' : action === 'RESOLVE' ? 'Resolve (action taken separately)' : 'Dismiss report'}
                  </button>
                ))}
              </div>
            </> : <p className="text-sm whitespace-pre-wrap">Resolution: {report.resolution}</p>}
          </article>
        ))}
        <div className="flex gap-4 text-sm items-center">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40">Previous</button>
          <span>Page {page} of {Math.max(1, reports.data.totalPages)}</span>
          <button disabled={page >= reports.data.totalPages} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40">Next</button>
        </div>
      </>}
      {review.isError && <p role="alert" className="text-red-700">Could not complete the review. Check permissions and refresh the queue before trying again.</p>}
    </section>
  );
}
