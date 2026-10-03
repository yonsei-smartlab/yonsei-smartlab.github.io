// Preserve imported source records while omitting notices and correspondence.
// These reviewed correction records use the original article title on Scholar.
const reviewedNoticeIds = new Set(['gsN89kCJA0AC', 'W5xh706n7nkC', 'MLfJN-KU85MC']);
export function isPublicationNotice(title: string, scholarId?: string) {
  return reviewedNoticeIds.has(scholarId ?? '') || /^(?:corrigendum|erratum|correction|retraction|withdrawal|addendum|reply\b|response to (?:letter|comment))\b/i.test(title.trim());
}
