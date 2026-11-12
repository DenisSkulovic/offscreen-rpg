import { isCommonAssetRequest } from 'msw';

/** Storybook/Vite asset traffic must not trip the API guard. */
function isStorybookAssetRequest(request: Request) {
  return /\.eot$|\.mdx$|sb-common-assets|iframe\.html|sb-vite|@vite|@react-refresh|\/virtual:|\.stories\./.test(
    request.url,
  );
}

/**
 * Provider-free MSW worker: `/api/*` without a story handler is an error.
 * Never proxy to Nest, Temporal or paid Storyteller from the workbench.
 */
export async function setupStorybookMsw() {
  const { setupWorker } = await import('msw/browser');
  const worker = setupWorker();
  await worker.start({
    quiet: true,
    onUnhandledRequest(request, print) {
      if (isCommonAssetRequest(request) || isStorybookAssetRequest(request)) {
        return;
      }
      const pathname = new URL(request.url).pathname;
      if (pathname.startsWith('/api/')) {
        print.error();
        throw new Error(
          `Unhandled Storybook API request (no Nest/provider): ${request.method} ${pathname}`,
        );
      }
      print.warning();
    },
  });
  return worker;
}
