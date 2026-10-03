import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

const research = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/research' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number().default(0),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    imageCaption: z.string().optional(),
    secondaryImage: z.string().optional(),
    secondaryImageAlt: z.string().optional(),
    secondaryImageCaption: z.string().optional(),
    placeholder: z.boolean().default(false),
  }),
});

const people = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/people' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    group: z.enum(['Professor', 'Researchers', 'Students', 'Alumni']),
    order: z.number().default(0),
    summary: z.string(),
    photo: z.string().optional(),
    photoAlt: z.string().optional(),
    email: z.email().optional(),
    scholar: z.url().optional(),
    orcid: z.url().optional(),
    placeholder: z.boolean().default(false),
  }),
});

const publications = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/publications' }),
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()),
    journal: z.string(),
    year: z.number().int().optional(),
    order: z.number().default(0),
    doi: z.string().optional(),
    scholarId: z.string().optional(),
    scholarUrl: z.url().optional(),
    importedOn: z.string().optional(),
    publicationDate: z.string().optional(),
    forthcoming: z.boolean().default(false),
    metadataNote: z.string().optional(),
    reviewRequired: z.boolean().default(false),
    authorListIncomplete: z.boolean().default(false),
    pdf: z.string().optional(),
    url: z.url().optional(),
    areas: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    placeholder: z.boolean().default(false),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    originalTitle: z.string(),
    originalLanguage: z.enum(['ko', 'en']).default('ko'),
    goodwellness: z.boolean().default(false),
    image: z.string().regex(/^\/images\/news\//).optional(),
    imageAlt: z.string().optional(),
    imageWidth: z.number().int().optional(),
    imageHeight: z.number().int().optional(),
    imageCredit: z.string().optional(),
    imageSource: z.url().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    summary: z.string(),
    source: z.string(),
    url: z.url(),
  }).superRefine((entry, context) => {
    if (entry.image && (!entry.imageAlt || !entry.imageCredit || !entry.imageSource
      || !entry.imageWidth || !entry.imageHeight)) {
      context.addIssue({ code: 'custom', message: 'News images require alt text, credit, original source URL and dimensions.' });
    }
  }),
});

export const collections = { research, people, publications, news };
