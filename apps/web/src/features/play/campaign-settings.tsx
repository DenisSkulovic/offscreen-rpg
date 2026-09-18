'use client';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { creativeSettingsSchema, campaignSettingsSchema, type CampaignView, type CreativeSettings } from '@offscreen/contracts/campaign';
import { useCampaignCommand } from './use-campaign-command';
import { submitStoryJson } from '@/src/lib/story-transport';

const presetSchema = z.object({ id: z.string(), name: z.string(), creative: creativeSettingsSchema });
type Preset = z.infer<typeof presetSchema>;
const suggestedTags = [
  { id: 'melancholy', description: 'Quiet reflection, small details, bittersweet encounters; do not force tragedy.' },
  { id: 'absurd-comedy', description: 'Occasional surreal incongruities and deadpan dialogue, while preserving established consequences.' },
  { id: 'growth', description: 'Make room for ordinary work, study and gradual improvement without forced danger.' },
];

export function CampaignSettingsEditor({ story, campaign, onSnapshot }: { story: StorySnapshot; campaign: CampaignView; onSnapshot: (story: StorySnapshot) => void }) {
  const [creative, setCreative] = useState(campaign.settings.creative);
  const [catalogue, setCatalogue] = useState<Preset[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [name, setName] = useState('My storyteller');
  const [presetId, setPresetId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [history, setHistory] = useState<{ revision: number; tone: string; createdAt: string }[]>([]);
  const presetRequest = useRef<{ id: string; body: { name: string; creative: CreativeSettings } } | null>(null);
  const command = useCampaignCommand(story.id, onSnapshot);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const results = await Promise.allSettled(['/api/stories/presets/catalogue', '/api/stories/presets'].map(async (url) => {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Unavailable');
        return z.array(presetSchema).parse(await response.json());
      }));
      if (controller.signal.aborted) return;
      if (results[0]?.status === 'fulfilled') setCatalogue(results[0].value);
      if (results[1]?.status === 'fulfilled') setPresets(results[1].value);
      if (results.some((result) => result.status === 'rejected')) setMessage('Some presets could not be loaded. Current settings are preserved.');
    }
    void load();
    return () => controller.abort();
  }, []);
  async function savePreset() {
    if (savingPreset) return;
    const parsed = creativeSettingsSchema.safeParse(creative);
    if (!parsed.success) { setMessage('Review the field limits before saving.'); return; }
    presetRequest.current ??= { id: crypto.randomUUID(), body: { name, creative: parsed.data } };
    setSavingPreset(true);
    try {
      const response = await submitStoryJson({ url: `/api/stories/presets/${presetRequest.current.id}`, body: presetRequest.current.body });
      if (!response.ok) throw new Error('Unavailable');
      const saved = presetSchema.parse(await response.json());
      setPresets((prior) => [...prior.filter((item) => item.id !== saved.id), saved]);
      presetRequest.current = null;
      setMessage('Private preset saved.');
    } catch { setMessage('Could not confirm preset save. The next save retries the same captured values.'); }
    finally { setSavingPreset(false); }
  }
  async function showHistory() {
    try {
      const response = await fetch(`/api/stories/${story.id}/settings`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unavailable');
      const rows = z.array(z.object({ settings: campaignSettingsSchema, createdAt: z.string() })).parse(await response.json());
      setHistory(rows.map((row) => ({ revision: row.settings.revision, tone: row.settings.creative.tone, createdAt: row.createdAt })));
    } catch { setMessage('Settings history is unavailable.'); }
  }
  return <details>
    <summary>Storyteller settings · revision {campaign.settings.revision}{campaign.settings.locked ? ' · locked' : ''}</summary>
    <p>Change the DM's creative direction without changing your character or past outcomes. An admitted action keeps its original settings; these edits apply to the next action.</p>
    <p>Offline rehearsal uses authored scenes and mechanical summaries. Custom guidance is saved for bounded generated tasks; it does not make the offline source improvise.</p>
    <fieldset disabled={campaign.settings.locked || command.busy || command.retry}>
      <legend>Effective creative settings</legend>
      <label>Apply a preset <select value="" onChange={(event) => {
        const preset = [...catalogue, ...presets].find((item) => item.id === event.target.value);
        if (preset) {
          setCreative(preset.creative);
          setPresetId(presets.some((item) => item.id === preset.id) ? preset.id : null);
        }
      }}><option value="">Choose a preset</option>{[...catalogue, ...presets].map((preset) => <option value={preset.id} key={preset.id}>{preset.name}</option>)}</select></label>
      <label>Tone <textarea maxLength={1200} value={creative.tone} onChange={(event) => setCreative({ ...creative, tone: event.target.value })} /></label>
      <label>Emphasis <select value={creative.emphasis} onChange={(event) => setCreative({ ...creative, emphasis: creativeSettingsSchema.shape.emphasis.parse(event.target.value) })}>{['balanced', 'economy', 'growth', 'adventure', 'social'].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Narrative surprise preference <select value={creative.surprises} onChange={(event) => setCreative({ ...creative, surprises: creativeSettingsSchema.shape.surprises.parse(event.target.value) })}>{['rare', 'occasional', 'frequent'].map((value) => <option key={value}>{value}</option>)}</select></label>
      <p>This guidance does not change the probability of mechanical events.</p>
      <p>Suggested narrative tags: {suggestedTags.map((tag) => <button key={tag.id} type="button" disabled={creative.tags.length >= 16} onClick={() => setCreative({ ...creative, tags: [...creative.tags.filter((item) => item.id !== tag.id), tag] })}>{tag.id}</button>)}</p>
      {creative.tags.map((tag, index) => <div key={index}>
        <label>Tag ID <input maxLength={60} value={tag.id} onChange={(event) => setCreative({ ...creative, tags: creative.tags.map((item, i) => i === index ? { ...item, id: event.target.value } : item) })} /></label>
        <label>Description <textarea maxLength={400} value={tag.description} onChange={(event) => setCreative({ ...creative, tags: creative.tags.map((item, i) => i === index ? { ...item, description: event.target.value } : item) })} /></label>
        <button onClick={() => setCreative({ ...creative, tags: creative.tags.filter((_, i) => i !== index) })}>Remove tag</button>
      </div>)}
      <button disabled={creative.tags.length >= 16} onClick={() => setCreative({ ...creative, tags: [...creative.tags, { id: `custom-${creative.tags.length + 1}`, description: '' }] })}>Add custom narrative tag</button>
      <p>Tags describe creative intent. They do not grant coins, powers or rule changes.</p>
      {creative.guidance.map((snippet, index) => <label key={index}>Guidance {index + 1}<textarea maxLength={1200} value={snippet} onChange={(event) => setCreative({ ...creative, guidance: creative.guidance.map((item, i) => i === index ? event.target.value : item) })} /><button onClick={() => setCreative({ ...creative, guidance: creative.guidance.filter((_, i) => i !== index) })}>Remove guidance</button></label>)}
      <button disabled={creative.guidance.length >= 4} onClick={() => setCreative({ ...creative, guidance: [...creative.guidance, ''] })}>Add guidance</button>
      <button onClick={() => {
        const parsed = creativeSettingsSchema.safeParse(creative);
        if (!parsed.success) { setMessage('Use unique lowercase tag IDs, nonempty descriptions/guidance, and the displayed field limits.'); return; }
        void command.send('settings', { expectedRevision: campaign.settings.revision, creative: parsed.data, ...(presetId ? { presetId } : {}) });
      }}>Save these settings for the next action</button>
      <label>Private preset name <input maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <button disabled={savingPreset} onClick={() => void savePreset()}>Save as a private preset</button>
    </fieldset>
    <p>Rules: SRD 5.2.1 subset. Risk: nonlethal. Creative presets leave speed and these permissions unchanged.</p>
    {message || command.message ? <p role="status">{message || command.message}</p> : null}
    {command.retry ? <button disabled={command.busy} onClick={() => void command.send()}>Retry settings save</button> : null}
    <button onClick={() => void showHistory()}>Show saved settings history</button>
    {history.map((entry) => <p key={entry.revision}>Revision {entry.revision} · {entry.createdAt} · {entry.tone}</p>)}
  </details>;
}
