// Programme topics supplied by SMART Lab; additional topics appear in the Yonsei CV.
// Provider resources explain each method. They do not establish SMART Lab accreditation,
// scheduled cohorts, course fees, or authority to award an external credential.
export interface TrainingProgram {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  resource?: { label: string; href: string };
}

export const specialistPrograms: TrainingProgram[] = [
  {
    id: 'dns', title: 'DNS', subtitle: 'Dynamic Neuromuscular Stabilization',
    description: 'Developmental kinesiology, postural control, and coordinated movement. Clinical and exercise training follow the Prague School approach.',
    resource: { label: 'Prague School · DNS', href: 'https://www.rehabps.com/dns.html' },
  },
  {
    id: 'janda', title: 'Janda approach', subtitle: 'Assessment and treatment of muscle imbalance',
    description: 'Muscle imbalance assessment, movement patterns, and sensorimotor training for musculoskeletal rehabilitation.',
    resource: { label: 'Movement Links · Janda education', href: 'https://www.movementlinks.com/resources.php' },
  },
  {
    id: 'mdt', title: 'McKenzie MDT', subtitle: 'Mechanical Diagnosis and Therapy',
    description: 'Mechanical assessment and classification of spinal and extremity conditions using the McKenzie Method.',
    resource: { label: 'McKenzie Institute · Education', href: 'https://mckenzieinstitute.org/education/' },
  },
  {
    id: 'robotic-rehabilitation', title: 'Robotic rehabilitation', subtitle: 'Musculoskeletal and neuromuscular impairments',
    description: 'Robot-assisted gait and upper-limb rehabilitation, movement assessment, and clinical applications of rehabilitation technology.',
  },
];

export const additionalPrograms: TrainingProgram[] = [
  {
    id: 'ces', title: 'Corrective exercise', subtitle: 'NASM Corrective Exercise Specialist (CES)',
    description: 'Movement assessment and corrective exercise programming.',
    resource: { label: 'NASM · CES', href: 'https://www.nasm.org/products/corrective-exercise-specialization' },
  },
  {
    id: 'msi', title: 'Movement system impairment', subtitle: 'Movement System Impairment (MSI) syndromes',
    description: 'Assessment of alignment, movement patterns, and muscle imbalances using the Sahrmann movement system framework.',
    resource: { label: 'Washington University · Courses', href: 'https://pt.wustl.edu/education/movement-system-impairment-syndromes-courses/' },
  },
  {
    id: 'graston', title: 'Graston Technique', subtitle: 'Instrument-assisted soft tissue mobilization',
    description: 'Foundational instrument skills and clinical applications. Essential Training corresponds to the former M1 course.',
    resource: { label: 'Graston Technique · Essential Training', href: 'https://grastontechnique.com/university/essential-training/' },
  },
];
