# SMART Lab website

A free static website starter for SMART Lab at Yonsei University. The page organization follows the Cohen Lab reference; the restyled appearance uses Yonsei’s official website as its visual reference.

Navigation: **Home · Research · People · Publications · Join Us / Contact**. There is no News page.

## Updating the website through this chat

Describe the change and provide the real text, publication details, or photos. The editable content is kept here:

| Content | Location |
| --- | --- |
| Lab name, introduction, affiliation, address, recruitment, navigation | `src/data/site.ts` |
| Research areas | `src/content/research/*.md` |
| People and biographies | `src/content/people/*.md` |
| Publications | `src/content/publications/*.md` |
| Uploaded lab photos and figures | `public/images/` |
| Colors, typography, and layout styling | `src/styles/global.css` |

Every bracketed field and empty image frame is a placeholder. No sample person, paper, email address, or research finding should be presented as real. Add real years, links, and image paths to the Markdown frontmatter when available. Set `placeholder: false` after replacing an entry. Set `draft: false` in `src/data/site.ts` when the site is ready to remove the footer’s draft notice.

## Local development

Use Node.js 24 and pnpm 11:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm build
pnpm check:site
```

## Working from another computer

Install Git, Node.js 24, and pnpm 11. Then clone the complete source:

```sh
git clone https://github.com/yonsei-smartlab/yonsei-smartlab.github.io.git
cd yonsei-smartlab.github.io
pnpm install --frozen-lockfile
pnpm dev
```

Open the cloned folder as a project in Codex to continue editing through chat. The design and cost requirements are recorded in `AGENTS.md` so they travel with the repository. Authenticate Git on the new computer using the `yonsei-smartlab` account before pushing updates.

Before starting work on either computer, run `git pull --ff-only` with a clean working tree. After checking a change, commit and push it to `main`; the GitHub Actions workflow publishes the updated website automatically. Save any unfinished local edits before switching computers so the other computer can retrieve them.

## Hosting and cost

The output is static files. It needs no database, server subscription, paid APIs, CMS, or external font service. The public repository is https://github.com/yonsei-smartlab/yonsei-smartlab.github.io. GitHub Pages hosts the website using standard GitHub Actions runners, without a paid hosting plan.

The website URL is https://yonsei-smartlab.github.io/. A university hostname can be added after Yonsei confirms its DNS configuration; no custom hostname or CNAME is configured yet.

The earlier visual study remains in the ignored `design-preview/` folder and is excluded from the website and deployments.

## Visual references and licenses

- Yonsei’s official website: https://www.yonsei.ac.kr/sc/index.do and its academic content pages. Primary blue `#003477`, link accent `#1163ff`, white/neutral surfaces, and dark footer are taken from the site’s styles. No university photographs or logo are included.
- The official site uses Paperlogy. The three locally hosted WOFF2 weights are provided under SIL OFL 1.1; the notice is in `public/fonts/LICENSE.txt`. Font publisher: https://freesentation.blog/paperlogyfont.
- Cohen Lab’s MIT-licensed starter informed the layout: https://github.com/bchcohenlab/lab-website-template. Its code license is retained in `LICENSE`. Borrowed people, papers, photographs, research details, and paid integrations are excluded.

