// Replace bracketed text as the lab's real details become available.
// The site remains static: no API keys, paid integrations, or database.
export const site = {
  draft: true,
  name: 'SMART Lab',
  university: 'Yonsei University',
  department: '[Department / affiliation]',
  description: '[Add a brief introduction to the lab: what you study, the questions you ask, and why the work matters.]',
  url: 'https://yonsei-smartlab.github.io',
  email: '',
  address: ['[Building and room]', '[Campus / street address]'],
  labDescription: '[Add a short description of the lab and its working environment.]',
  researchProcessDescription: '[Describe how these research steps connect.]',
  researchSteps: [
    { title: '[Step 1 title]', description: '[Short description]' },
    { title: '[Step 2 title]', description: '[Short description]' },
    { title: '[Step 3 title]', description: '[Short description]' },
    { title: '[Step 4 title]', description: '[Short description]' },
    { title: '[Step 5 title]', description: '[Short description]' },
  ],
  images: {
    // Put real lab images in public/images and enter paths such as /images/lab.jpg.
    labPhoto: '',
    labPhotoAlt: '',
  },
  nav: [
    { label: 'Home', href: '/' },
    { label: 'Research', href: '/research/' },
    { label: 'People', href: '/people/' },
    { label: 'Publications', href: '/publications/' },
    { label: 'Join Us / Contact', href: '/contact/' },
  ],
  contact: {
    introduction: '[Add information for prospective students, collaborators, and visitors.]',
    recruitmentStatus: '[Recruitment status]',
    opportunities: '[Describe available positions, eligibility, and research interests.]',
    applicationInstructions: '[Explain how to contact the PI and what application materials to include.]',
    collaboration: '[Add a short note for potential research collaborators.]',
    directions: '[Add directions, access information, or a map once the lab address is confirmed.]',
  },
};
