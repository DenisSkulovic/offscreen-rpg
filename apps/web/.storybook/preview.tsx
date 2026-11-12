import type { Preview } from '@storybook/nextjs-vite';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { setupStorybookMsw } from './msw-setup';
import { withIsolatedQueryClient } from '../src/stories/decorators/query-isolation';
import '../app/style.css';

const preview: Preview = {
  decorators: [withIsolatedQueryClient],
  loaders: [mswLoader(setupStorybookMsw)],
  parameters: {
    layout: 'fullscreen',
    a11y: {
      test: 'todo',
    },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    msw: {
      handlers: [],
    },
  },
};

export default preview;
