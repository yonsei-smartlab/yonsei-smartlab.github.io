// Alumni membership and professional roles were supplied by SMART Lab.
// Affiliation sources and unresolved identities are recorded in README.md.
export interface Alumnus {
  name: string;
  role: string;
  institution?: string;
  institutionKorean?: string;
  department?: string;
  profile?: string;
}

const hallaProfile = 'https://www.chu.ac.kr/school/02school/sub02/sub02.php';
export const academicAlumni: Alumnus[] = [
  { name: '박찬희', role: 'Professor', institution: 'Jeonju University', institutionKorean: '전주대학교', department: 'Department of Physical Therapy', profile: 'https://www.jj.ac.kr/pt/info/faculty.do' },
  { name: '신윤겸', role: 'Professor' },
  { name: '오원준', role: 'Professor', institution: 'Cheju Halla University', institutionKorean: '제주한라대학교', department: 'Department of Physical Therapy', profile: hallaProfile },
  { name: '윤현식', role: 'Professor', institution: 'Kyungnam University', institutionKorean: '경남대학교', department: 'Department of Physical Therapy', profile: 'https://www.kyungnam.ac.kr/pt/1820/subview.do' },
  { name: '이남기', role: 'Professor', institution: 'Kwangju Women’s University', institutionKorean: '광주여자대학교', department: 'Department of Physical Therapy', profile: 'https://pt.kwu.ac.kr/index.do' },
  { name: '이동률', role: 'Professor', institution: 'Honam University', institutionKorean: '호남대학교', department: 'Department of Physical Therapy', profile: 'https://pt.honam.ac.kr/DepartmentProfessor/178' },
  { name: '이정재', role: 'Professor', institution: 'Eulji University', institutionKorean: '을지대학교', department: 'Department of Physical Therapy', profile: 'https://major.eulji.ac.kr/renewal-therapy/index.html?menuno=2908&id=30941&type=F&gubun=view' },
  { name: '신지원', role: 'Professor', institution: 'Cheju Halla University', institutionKorean: '제주한라대학교', department: 'Department of Physical Therapy', profile: hallaProfile },
  { name: '차영주', role: 'Professor', institution: 'Cheju Halla University', institutionKorean: '제주한라대학교', department: 'Department of Physical Therapy', profile: hallaProfile },
  { name: '천승철', role: 'Professor', institution: 'Konyang University', institutionKorean: '건양대학교', department: 'Department of Physical Therapy', profile: 'https://www.konyang.ac.kr/kygrad/sub02_04_02_05.do' },
  { name: '최형주', role: 'Professor', institution: 'Daejeon Health University', institutionKorean: '대전보건대학교', department: 'Department of Physical Therapy', profile: 'https://www.hit.ac.kr/pt/staff-professor' },
];

export const professionalAlumni: Alumnus[] = [
  { name: '김희준', role: 'Postdoctoral researcher' },
  { name: '정지희', role: 'Obstetrician–gynecologist' },
  { name: '박지호', role: 'National research institute researcher' },
  { name: '김건', role: 'Physical therapist · United States' },
  { name: '박하은', role: 'AI industry' },
];

export interface Collaborator {
  name: string;
  koreanName?: string;
  credentials: string;
  institution: string;
  unit?: string;
  location: string;
  specialty: string;
  profile: string;
}

// User-supplied international collaborators, deduplicated and geographically filtered.
// No third-party email addresses or phone numbers are stored or displayed.
export const internationalCollaborators: Collaborator[] = [
  { name: 'Hermano Igo Krebs', credentials: 'PhD', institution: 'Massachusetts Institute of Technology', unit: 'Department of Mechanical Engineering', location: 'United States', specialty: 'Rehabilitation robotics', profile: 'https://meche.mit.edu/people/faculty/hikrebs%40mit.edu' },
  { name: 'Arun Jayaraman', credentials: 'PT, PhD', institution: 'Shirley Ryan AbilityLab', unit: 'Max Näder Center for Rehabilitation Technologies and Outcomes Research', location: 'Chicago, United States', specialty: 'Rehabilitation technologies', profile: 'https://www.sralab.org/researchers/arun-jayaraman-pt-phd' },
  { name: 'Tae Hwan Chung', koreanName: '정태환', credentials: 'MD', institution: 'Northwestern University Feinberg School of Medicine', unit: 'Physical Medicine and Rehabilitation; Medicine (Cardiology)', location: 'Chicago, United States', specialty: 'Neuromuscular medicine', profile: 'https://www.feinberg.northwestern.edu/faculty-profiles/az/profile.html?xid=70779' },
  { name: 'Mooyeon Oh-Park', credentials: 'MD, MS', institution: 'Albert Einstein College of Medicine · Burke Rehabilitation Hospital', location: 'New York, United States', specialty: 'Rehabilitation medicine and neurology', profile: 'https://einsteinmed.edu/faculty/1826/mooyeon-oh-park' },
  { name: 'Dylan J. Edwards', credentials: 'PhD, PT', institution: 'Thomas Jefferson University', unit: 'Jefferson Moss Rehabilitation Research Institute', location: 'United States', specialty: 'Motor recovery and neuromodulation', profile: 'https://www.jefferson.edu/academics/colleges-schools-institutes/skmc/departments/rehabilitation/faculty/edwards.html' },
  { name: 'Carolin Dohle', credentials: 'MD', institution: 'Westchester Medical Center · New York Medical College', location: 'New York, United States', specialty: 'Neurology and rehabilitation', profile: 'https://www.wmchealth.org/graduate-medical-education/neurology-residency-program' },
  { name: 'Thomas C. Bulea', credentials: 'PhD', institution: 'National Institutes of Health Clinical Center', unit: 'Neurorobotics Research Group', location: 'United States', specialty: 'Neurorobotics and biomechanics', profile: 'https://www.cc.nih.gov/meet-our-doctors/tbulea' },
  { name: 'Myunghee Kim', credentials: 'PhD', institution: 'University of Illinois Chicago', unit: 'Department of Mechanical and Industrial Engineering', location: 'Chicago, United States', specialty: 'Rehabilitation robotics', profile: 'https://mie.uic.edu/profiles/myunghee-kim/' },
  { name: 'Clare C. Frank', credentials: 'PT, DPT, MS', institution: 'Movement Links', location: 'United States', specialty: 'Janda approach and DNS', profile: 'https://www.movementlinks.com/team.php' },
  { name: 'Michael A. Rintala', credentials: 'DC', institution: 'Rintala Chiropractic', location: 'San Diego, United States', specialty: 'DNS and sports rehabilitation', profile: 'https://rintalachiro.com/about/' },
  { name: 'Alena Kobesová', credentials: 'MD, PhD', institution: 'Charles University · University Hospital Motol', unit: 'Department of Rehabilitation and Sports Medicine', location: 'Prague, Czechia', specialty: 'Dynamic Neuromuscular Stabilization', profile: 'https://rehabps.com/kobesova.html' },
  { name: 'Martina Ježková', credentials: 'MPT', institution: 'Charles University · Prague School of Rehabilitation', unit: 'Second Faculty of Medicine', location: 'Czechia', specialty: 'Dynamic Neuromuscular Stabilization', profile: 'https://rehabps.com/jezkova.html' },
  { name: 'Petra Valouchová', credentials: 'MPT, PhD', institution: 'Centre of Movement Medicine', location: 'Prague, Czechia', specialty: 'DNS and movement biomechanics', profile: 'https://rehabps.com/valouchova.html' },
  { name: 'Rumpa Boonsinsukh', credentials: 'PhD', institution: 'Srinakharinwirot University', location: 'Thailand', specialty: 'Posture and gait', profile: 'https://research.swu.ac.th/director' },
  { name: 'Marco Pang', credentials: 'PhD', institution: 'The Hong Kong Polytechnic University', unit: 'Department of Rehabilitation Sciences', location: 'Hong Kong', specialty: 'Neurorehabilitation, posture and gait', profile: 'https://www.polyu.edu.hk/rs/people/academic-staff/prof-pang-marco/?sc_lang=en' },
  { name: 'Yijian Yang', credentials: 'MD, PhD', institution: 'The Chinese University of Hong Kong', unit: 'Department of Sports Science and Physical Education', location: 'Hong Kong', specialty: 'Sports biomechanics, posture and gait', profile: 'https://research.cuhk.edu.hk/en/persons/yijian-yang/' },
];

export const rememberedCollaborator = {
  name: 'Mark Hallett', credentials: 'MD', years: '1943–2025',
  institution: 'National Institute of Neurological Disorders and Stroke, NIH',
  specialty: 'Human motor control and movement disorders',
  profile: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13472719/',
};
