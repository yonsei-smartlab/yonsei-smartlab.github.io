import groups from '../data/news-groups.json' with { type: 'json' };

interface NewsRecord { id: string; data: { date: string }; }

// Group only reviewed coverage of the same event, never headlines or dates alone.
export function getNewsStories<T extends NewsRecord>(entries: T[]) {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const assigned = new Set<string>();
  const stories: { id: string; primary: T; reports: T[]; date: string; firstDate: string; years: string[] }[] = [];
  function addStory(id: string, primaryId: string, reportIds: string[]) {
    if (!reportIds.includes(primaryId)) throw new Error(`News group ${id} is missing its primary report`);
    const reports = reportIds.map(reportId => {
      const report = byId.get(reportId);
      if (!report || assigned.has(reportId)) throw new Error(`Missing or repeated news report: ${reportId}`);
      assigned.add(reportId);
      return report;
    }).sort((a, b) => b.data.date.localeCompare(a.data.date) || a.id.localeCompare(b.id));
    stories.push({ id, primary: byId.get(primaryId)!, reports, date: reports[0].data.date,
      firstDate: reports.at(-1)!.data.date, years: [...new Set(reports.map(report => report.data.date.slice(0, 4)))] });
  }
  for (const group of groups) addStory(group.id, group.primary, group.reports);
  for (const entry of entries) if (!assigned.has(entry.id)) addStory(entry.id, entry.id, [entry.id]);
  return stories.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
