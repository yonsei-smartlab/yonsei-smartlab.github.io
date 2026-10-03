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
    placeholder: z.boolean().default(false),
  }),
});

const people = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/people' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    group: z.enum(['Principal Investigator', 'Researchers', 'Students', 'Alumni']),
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
    pdf: z.string().optional(),
    url: z.url().optional(),
    areas: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    placeholder: z.boolean().default(false),
  }),
});

export const collections = { research, people, publications };
