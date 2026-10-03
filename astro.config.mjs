import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://yonsei-smartlab.github.io',
  output: 'static',
  trailingSlash: 'always',
  redirects: {
    '/research/affiliations/': '/research/walkbot/',
    '/research/grants/': '/grants-ip/?category=grants',
    '/research/patents/': '/grants-ip/?category=patents',
    '/people/': '/members/',
    '/people/pi/': '/professor/',
    '/people/researcher/': '/members/researcher/',
    '/people/student/': '/members/student/',
    '/people/alumni/': '/members/#alumni',
    '/members/alumni/': '/members/#alumni',
  },
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
  integrations: [sitemap()],
});
