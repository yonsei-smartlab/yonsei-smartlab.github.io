export interface BusInformation {
  stops: { name: string; routes: number[] }[];
  note?: string;
  source: string;
}

// Nearby stops from the PlaceView pages supplied by the user on October 3, 2026.
// Same-name 흥업사거리 listings describe different boarding points/directions:
// [30,31,34], [8,9,31,33,34,35], [8,9,30,33,35] (last set repeated).
// The public list combines these route numbers with a boarding-direction note.
// No travel times, timetables, stop IDs, or walking distances are inferred.
export const officeBusInformation: BusInformation = {
  stops: [{ name: '연세대복지타운', routes: [30, 31, 34] }],
  source: 'https://www.placeview.co.kr/id/MTc1NjY4MjAg',
};

export const centerBusInformation: BusInformation = {
  stops: [
    { name: '흥업지구대', routes: [30, 31, 34] },
    { name: '보촌', routes: [30, 31, 34] },
    { name: '흥업사거리', routes: [8, 9, 30, 31, 33, 34, 35] },
  ],
  note: 'Routes at 흥업사거리 vary by boarding direction.',
  source: 'https://www.placeview.co.kr/id/NDgwNDA2NDA2',
};
