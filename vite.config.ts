import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

function getHtmlInputs(): Record<string, string> {
  const inputs: Record<string, string> = {
    main: path.resolve(__dirname, 'index.html'),
    en_main: path.resolve(__dirname, 'en/index.html'),
    ar_main: path.resolve(__dirname, 'ar/index.html'),
  };

  const scanDirs = [
    'en/services',
    'ar/services',
    'en/articles',
    'ar/articles',
    'en/certifications',
    'ar/certifications',
    'en/tenders',
    'ar/tenders',
    'en/cv',
    'ar/cv',
    'en/portfolio',
    'ar/portfolio',
    'en/contact',
    'ar/contact'
  ];

  for (const dir of scanDirs) {
    const fullDir = path.resolve(__dirname, dir);
    if (fs.existsSync(fullDir)) {
      const files = fs.readdirSync(fullDir);
      for (const file of files) {
        if (file.endsWith('.html')) {
          const cleanKey = `${dir.replace(/\//g, '_')}_${file.replace('.html', '')}`.replace(/[^a-zA-Z0-9_]/g, '_');
          inputs[cleanKey] = path.resolve(fullDir, file);
        }
      }
    }
  }

  return inputs;
}

function preserveSeoLinks() {
  return {
    name: 'preserve-seo-links',
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string, ctx: { filename: string }) {
        if (!ctx.filename || !fs.existsSync(ctx.filename)) return html;

        const source = fs.readFileSync(ctx.filename, 'utf8');
        const sourceLinks = source.match(/<link\s+rel="(?:canonical|alternate)"[^>]*>/g);
        if (!sourceLinks?.length) return html;

        let linkIndex = 0;
        return html.replace(/<link\s+rel="(?:canonical|alternate)"[^>]*>/g, (builtLink) => {
          return sourceLinks[linkIndex++] ?? builtLink;
        });
      },
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), preserveSeoLinks()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: getHtmlInputs(),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
