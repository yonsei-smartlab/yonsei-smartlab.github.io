export interface BusInformation {
  stops: { name: string; koreanName: string; routes: number[] }[];
  note?: string;
  source: string;
}

// Nearby stops from the PlaceView pages supplied by the user on October 3, 2026.
// Same-name 흥업사거리 listings describe different boarding points/directions:
// [30,31,34], [8,9,31,33,34,35], [8,9,30,33,35] (last set repeated).
// The public list combines these route numbers with a boarding-direction note.
// No travel times, timetables, stop IDs, or walking distances are inferred.
export const officeBusInformation: BusInformation = {
  stops: [{ name: 'Yonsei University Welfare Town', koreanName: '연세대복지타운', routes: [30, 31, 34] }],
  source: 'https://www.placeview.co.kr/id/MTc1NjY4MjAg',
};

export const centerBusInformation: BusInformation = {
  stops: [
    { name: 'Heungeop Police Station', koreanName: '흥업지구대', routes: [30, 31, 34] },
    { name: 'Bochon', koreanName: '보촌', routes: [30, 31, 34] },
    { name: 'Heungeop Intersection', koreanName: '흥업사거리', routes: [8, 9, 30, 31, 33, 34, 35] },
  ],
  note: 'Routes at Heungeop Intersection vary by boarding direction.',
  source: 'https://www.placeview.co.kr/id/NDgwNDA2NDA2',
};
