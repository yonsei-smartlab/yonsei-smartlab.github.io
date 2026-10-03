import { getCollection } from 'astro:content';

export async function getResearch() {
  return (await getCollection('research')).sort((a, b) => a.data.order - b.data.order);
}

export async function getPeople() {
  return (await getCollection('people')).sort((a, b) => a.data.order - b.data.order);
}

export async function getPublications() {
  return (await getCollection('publications')).sort((a, b) =>
    (b.data.year ?? 0) - (a.data.year ?? 0) || a.data.order - b.data.order,
  );
}
