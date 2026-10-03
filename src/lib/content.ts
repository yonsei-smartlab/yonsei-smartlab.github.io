import { getCollection } from 'astro:content';
import { isPublicationNotice } from './publication-policy';
import verifiedLinks from '../data/publication-doi-links.json';
import publicationReview from '../data/publication-review.json';

export async function getResearch() {
  return (await getCollection('research')).sort((a, b) => a.data.order - b.data.order);
}

export async function getPeople() {
  return (await getCollection('people')).sort((a, b) => a.data.order - b.data.order);
}

export async function getPublications() {
  const links = new Map(verifiedLinks.records.map(record => [record.scholarId, record]));
  const withheld = new Set([...publicationReview.excludedRecords, ...publicationReview.heldRecords].map(record => record.scholarId));
  const corrections = new Map(publicationReview.metadataCorrections.map(record => [record.scholarId, record]));
  return (await getCollection('publications')).filter(pub => !pub.data.reviewRequired && !withheld.has(pub.data.scholarId ?? '') && !isPublicationNotice(pub.data.title, pub.data.scholarId)).map(pub => {
    const link = links.get(pub.data.scholarId ?? '');
    const doi = pub.data.doi || (link?.sourceTitle === pub.data.title ? link.doi : undefined);
    const correction = corrections.get(pub.data.scholarId ?? '');
    const title = correction?.title ?? pub.data.title;
    const authors = correction?.authors ?? pub.data.authors;
    return { ...pub, data: { ...pub.data, title, authors, doi } };
  }).sort((a, b) =>
    (b.data.year ?? 0) - (a.data.year ?? 0) || a.data.order - b.data.order,
  );
}
