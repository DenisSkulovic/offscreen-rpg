import { describe, expect, it } from 'vitest';
import { makeCampaign } from '@/src/test/campaign-fixtures';
import { creativeToFormValues, formValuesToCreative } from './settings-form';

describe('settings form mapping', () => {
  it('round-trips creative settings through the editor values', () => {
    const creative = makeCampaign().settings.creative;
    const values = creativeToFormValues(creative, 'Preset');
    expect(formValuesToCreative(values, creative.profile)).toEqual(creative);
  });

  it('drops blank guidance rows on submit parse', () => {
    const creative = makeCampaign().settings.creative;
    const values = creativeToFormValues(creative);
    values.guidance = ['Keep this', '  ', ''];
    expect(formValuesToCreative(values, creative.profile).guidance).toEqual([
      'Keep this',
    ]);
  });
});
