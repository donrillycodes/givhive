"use client";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { safetyApi } from '@/lib/api';

type Pending = { id: string; title: string; targetType: string; updatedAt: string; ngo: { name: string }; type?: string; body?: string; summary?: string; coverImageUrl?: string };
export function PendingContent() {
  const client = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const pending = useQuery({ queryKey: ['pending-content'], queryFn: async () => (await safetyApi.pending()).data.data.items as Pending[] });
  const review = useMutation({ mutationFn: ({ item, action }: { item: Pending; action: string }) => safetyApi.reviewPending(item.targetType, item.id, action, item.updatedAt, notes[item.id] ?? ''),
    onSuccess: () => { void client.invalidateQueries({ queryKey: ['pending-content'] }); void client.invalidateQueries({ queryKey: ['admin-content'] }); } });
  return <section className="rounded-xl border border-border-subtle bg-white p-5 space-y-4">
    <div className="flex flex-wrap justify-between gap-3 items-center">
      <h2 className="text-xl font-semibold">Content awaiting publication</h2>
      <button className="text-sm underline disabled:opacity-40" disabled={pending.isFetching} onClick={() => { review.reset(); void pending.refetch(); }}>Refresh queue</button>
    </div>
    <p className="text-sm text-ink-muted">Updates stay hidden until approved. Check the full text and image against the community rules. Edits need a new review. Shows up to 25 updates, oldest first. Food needs from approved organisations publish immediately and can be moderated through safety reports.</p>
    {pending.isPending ? <p>Loading…</p> : pending.isError ? <button onClick={() => { void pending.refetch(); }}>Could not load. Retry</button> : pending.data.length === 0 ? <p>No content awaiting review.</p> : pending.data.map(item => {
      const image = item.coverImageUrl;
      return <article key={item.id} className="border border-border-subtle rounded p-4 space-y-3">
        <h3 className="font-semibold">{item.title} · {item.ngo.name}</h3>
        <p className="text-xs">{item.targetType.replaceAll('_', ' ')} · {new Date(item.updatedAt).toLocaleString()}</p>
        {[item.summary, item.body].filter(Boolean).map((text, index) => <p key={index} className="whitespace-pre-wrap break-words">{text}</p>)}
        {item.type && <p className="text-sm">Type: {item.type}</p>}
        {image?.startsWith('https://') && <a href={image} target="_blank" rel="noopener noreferrer" className="underline">Open image for review</a>}
        <label className="block text-sm">Review notes<textarea className="block w-full border border-border-default rounded p-2" maxLength={1000} value={notes[item.id] ?? ''} onChange={e => setNotes(current => ({ ...current, [item.id]: e.target.value }))} placeholder="Reason for the decision (5–1000 characters)" /></label>
        <div className="flex gap-4">{['APPROVE', 'REJECT'].map(action => <button key={action} className="border border-border-subtle rounded px-3 py-2 disabled:opacity-40" disabled={review.isPending || (notes[item.id]?.trim().length ?? 0) < 5} onClick={() => review.mutate({ item, action })}>{action === 'APPROVE' ? 'Approve publication' : 'Reject publication'}</button>)}</div>
      </article>;
    })}
    {review.isError && <p role="alert" className="text-red-700">Could not save. The content may have changed. Refresh and review it again.</p>}
  </section>;
}
