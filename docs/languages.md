# English and Korean pages

English is the primary interface at `/`. Korean counterparts are served at `/ko/`, including GOODWELLNESS Center pages. The header switch includes a decorative language icon, accessible language labels and the active language. Switching keeps the current page, search parameters and anchor. An explicit choice is remembered locally in the visitor’s browser; blocked storage does not prevent switching.

`src/lib/korean-localization.mjs` is an Astro integration that produces static Korean HTML after the normal build and serves corresponding pages during development. Both versions use the existing components, layout, Paperlogy font and site themes. The sitemap includes both versions, with canonical URLs and alternate-language links. No external translation service, key or paid infrastructure is used.

## Copy maintenance

`src/data/korean-translations.json` contains reviewed English-to-Korean prose and interface labels. When changing English copy, update its Korean entry in the same change. Preserve the factual scope and supplied names, dates and qualifications. Use natural academic Korean, concise headings and consistent terminology: 신경조절, 로봇 재활, 스포츠 운동과학. Retain SMART Lab and the documented full English institute name.

Bibliography titles, author strings, journal names, DOI URLs, registration numbers, original project/transfer records and named international training programmes retain their original wording. Korean books display the supplied Korean title first and the existing English title second. News uses its supplied original Korean headline when available, with English-language sources retaining their original title. News summaries are translated separately. Contact pages display the supplied Korean address first, with the English address secondary.

Run `pnpm check`, `pnpm build`, and `pnpm check:site`. The site check also compares the generated Korean and English publication records and checks language routes, identifiers and year fields. Inspect affected English and Korean pages, responsive navigation, filters, and language switching in a browser. New untranslated English prose must be reviewed manually; proper names and official scientific titles may intentionally remain English.
