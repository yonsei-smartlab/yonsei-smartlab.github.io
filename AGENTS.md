# SMART Lab website

This repository is the editable source for the Yonsei SMART Lab website. The PI maintains it through chat and may work from different computers.

## Product and design

- Keep exactly these five navigation tabs: Home, Research, People, Publications, Join Us / Contact. There is no News tab.
- Preserve the Cohen Lab home-page organization already implemented. The visual reference is Yonsei University's official website: https://www.yonsei.ac.kr/sc/index.do.
- Use the existing deep blue (#003477), bright blue accents (#1163ff), white and neutral gray surfaces, locally hosted Paperlogy font, and restrained academic styling.
- Keep the site clean, modern, and friendly. Avoid corporate marketing language, decorative AI-style illustrations, fabricated photos, and unnecessary content.
- Until the PI provides real content, use explicitly bracketed placeholders and blank image frames. Never invent people, publications, degrees, findings, contact details, recruitment claims, or affiliations.

## Cost and hosting

- The user requires free hosting and operation, with no hidden charges. Keep this a static website in the public GitHub Pages repository.
- Do not add paid services, API subscriptions, databases, a paid CMS, larger GitHub runners, or paid hosting or domain purchases.
- Use standard GitHub-hosted Ubuntu runners. Keep deployment artifact retention short and do not expand paid cache or storage limits.
- The live URL is https://yonsei-smartlab.github.io/. No university custom domain is configured; add one only after the user provides an approved hostname and DNS arrangement.

## Editing and verification

- Shared lab settings: `src/data/site.ts`. Research, people, and publication entries: `src/content/`. Styling: `src/styles/global.css`. Real images: `public/images/`.
- The font license is in `public/fonts/LICENSE.txt`; retain it and the MIT code license in `LICENSE`.
- Use Node.js 24 and pnpm 11.25.0 with the committed `pnpm-lock.yaml`.
- For site changes run `pnpm check`, `pnpm build`, and `pnpm check:site`, then inspect affected pages in a browser. Check mobile navigation when changing layout.
- Keep HTML IDs unique when multiple Markdown entries render on one page.
- `design-preview/`, `artifacts/`, dependencies, generated output, and credential or environment files are excluded from Git. The original visual study must not be deployed.
- Push reviewed changes to `main` to deploy through `.github/workflows/deploy.yml`. Avoid force pushes or overwriting changes from another computer.
- Keep GitHub authentication scoped to this project/account; do not replace authentication for the user's other projects.
