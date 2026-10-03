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
    '/members/': '/people/',
    '/people/pi/': '/professor/',
    '/members/researcher/': '/people/researcher/',
    '/members/student/': '/people/student/',
    '/people/alumni/': '/people/#alumni',
    '/members/alumni/': '/people/#alumni',
  },
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
  integrations: [sitemap()],
});
