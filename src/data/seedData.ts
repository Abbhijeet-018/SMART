import { Faculty, Course, BenchmarkReference, AppSettings } from '../types';

export const BENCHMARK_REFERENCE: BenchmarkReference = {
  name: 'CSE Department PBL AI Benchmark (Report Baseline)',
  description: 'Historical university PBL baseline report figures for state-space search comparison.',
  faculty_count: 5,
  course_count: 10,
  total_hours: 37,
  reported_max_load: 8,
  exhaustive_search_steps: 24733,
  pruned_search_steps: 169,
  search_reduction_pct: 99.32
};

export const INITIAL_SETTINGS: AppSettings = {
  department: 'Computer Science & Engineering',
  semester: 'Autumn Semester 2026-27',
  academic_year: '2026-2027',
  designation_caps: {
    Professor: 14,
    'Associate Professor': 14,
    'Assistant Professor': 16
  },
  optimization_preferences: {
    minimize_max_load: true,
    minimize_variance: true,
    balance_theory_lab: true
  },
  hard_constraints: {
    enforce_caps: true,
    require_qualification: true,
    require_lab_skills: true,
    require_availability: true
  }
};

/**
 * 5 Fictional Faculty Members with distinct specializations, lab competencies, and caps
 * (Sample project defaults, not official university policy)
 */
export const SEED_FACULTIES: Faculty[] = [
  {
    id: 'fac-1',
    faculty_code: 'FAC-AI-01',
    full_name: 'Dr. Rajesh Sharma',
    designation: 'Professor',
    specializations: ['Artificial Intelligence', 'Machine Learning', 'Deep Learning'],
    lab_skills: ['Python', 'PyTorch', 'Scikit-learn', 'TensorFlow'],
    max_weekly_hours: 14,
    availability: 'Available',
    notes: 'Senior Professor with 18+ years research in AI systems and neural architectures.',
    created_at: '2026-08-01T09:00:00Z'
  },
  {
    id: 'fac-2',
    faculty_code: 'FAC-DS-02',
    full_name: 'Dr. Anita Desai',
    designation: 'Associate Professor',
    specializations: ['Database Systems', 'Data Science', 'Big Data Engineering'],
    lab_skills: ['SQL', 'PostgreSQL', 'Python', 'Tableau', 'Spark'],
    max_weekly_hours: 14,
    availability: 'Available',
    notes: 'Specializes in distributed databases, indexing structures, and OLAP analytics.',
    created_at: '2026-08-01T09:15:00Z'
  },
  {
    id: 'fac-3',
    faculty_code: 'FAC-NET-03',
    full_name: 'Prof. Vikram Verma',
    designation: 'Associate Professor',
    specializations: ['Computer Networks', 'Cybersecurity', 'Distributed Systems'],
    lab_skills: ['Wireshark', 'Linux', 'Cisco Packet Tracer', 'NS3'],
    max_weekly_hours: 14,
    availability: 'Available',
    notes: 'Department network lab in-charge; lead instructor for network security protocols.',
    created_at: '2026-08-01T09:30:00Z'
  },
  {
    id: 'fac-4',
    faculty_code: 'FAC-WEB-04',
    full_name: 'Prof. Sneha Patel',
    designation: 'Assistant Professor',
    specializations: ['Web Technologies', 'Cloud Computing', 'Software Engineering'],
    lab_skills: ['React', 'Node.js', 'Docker', 'Kubernetes', 'Git'],
    max_weekly_hours: 16,
    availability: 'Available',
    notes: 'Industry background in cloud-native microservices and modern web frameworks.',
    created_at: '2026-08-01T09:45:00Z'
  },
  {
    id: 'fac-5',
    faculty_code: 'FAC-ALGO-05',
    full_name: 'Prof. Karthik Rao',
    designation: 'Assistant Professor',
    specializations: ['Algorithms', 'Theory of Computation', 'Discrete Mathematics'],
    lab_skills: ['C/C++', 'Java', 'Linux', 'Python'],
    max_weekly_hours: 16,
    availability: 'Available',
    notes: 'Competitive programming mentor; core instructor for algorithmic complexity.',
    created_at: '2026-08-01T10:00:00Z'
  }
];

/**
 * 10 Fictional Courses totaling exactly 37 weekly teaching hours:
 * 7 Theory courses (4h each) = 28h
 * 3 Lab courses (3h each) = 9h
 * Sum = 37 hours.
 */
export const SEED_COURSES: Course[] = [
  {
    id: 'crs-1',
    course_code: 'CS501',
    title: 'Artificial Intelligence & Knowledge Representation',
    course_type: 'Theory',
    weekly_hours: 4,
    required_specialization: 'Artificial Intelligence',
    required_lab_skills: [],
    created_at: '2026-08-05T10:00:00Z'
  },
  {
    id: 'crs-2',
    course_code: 'CS502',
    title: 'Machine Learning & Deep Learning Foundations',
    course_type: 'Theory',
    weekly_hours: 4,
    required_specialization: 'Artificial Intelligence',
    required_lab_skills: [],
    created_at: '2026-08-05T10:15:00Z'
  },
  {
    id: 'crs-3',
    course_code: 'CS503',
    title: 'Database Management Systems & Architecture',
    course_type: 'Theory',
    weekly_hours: 4,
    required_specialization: 'Database Systems',
    required_lab_skills: [],
    created_at: '2026-08-05T10:30:00Z'
  },
  {
    id: 'crs-4',
    course_code: 'CS504',
    title: 'Advanced Database Systems & SQL Laboratory',
    course_type: 'Lab',
    weekly_hours: 3,
    required_specialization: 'Database Systems',
    required_lab_skills: ['SQL'],
    created_at: '2026-08-05T10:45:00Z'
  },
  {
    id: 'crs-5',
    course_code: 'CS505',
    title: 'Computer Networks & Internet Protocol Suite',
    course_type: 'Theory',
    weekly_hours: 4,
    required_specialization: 'Computer Networks',
    required_lab_skills: [],
    created_at: '2026-08-05T11:00:00Z'
  },
  {
    id: 'crs-6',
    course_code: 'CS506',
    title: 'Network Security & Packet Analysis Laboratory',
    course_type: 'Lab',
    weekly_hours: 3,
    required_specialization: 'Computer Networks',
    required_lab_skills: ['Wireshark', 'Linux'],
    created_at: '2026-08-05T11:15:00Z'
  },
  {
    id: 'crs-7',
    course_code: 'CS507',
    title: 'Cloud Computing & Distributed Web Architecture',
    course_type: 'Theory',
    weekly_hours: 4,
    required_specialization: 'Web Technologies',
    required_lab_skills: [],
    created_at: '2026-08-05T11:30:00Z'
  },
  {
    id: 'crs-8',
    course_code: 'CS508',
    title: 'Full Stack Web & Containerization Laboratory',
    course_type: 'Lab',
    weekly_hours: 3,
    required_specialization: 'Web Technologies',
    required_lab_skills: ['React', 'Docker'],
    created_at: '2026-08-05T11:45:00Z'
  },
  {
    id: 'crs-9',
    course_code: 'CS509',
    title: 'Design & Analysis of Algorithms',
    course_type: 'Theory',
    weekly_hours: 4,
    required_specialization: 'Algorithms',
    required_lab_skills: [],
    created_at: '2026-08-05T12:00:00Z'
  },
  {
    id: 'crs-10',
    course_code: 'CS510',
    title: 'Advanced Algorithmic Graph Theory & Complexity',
    course_type: 'Theory',
    weekly_hours: 4,
    required_specialization: 'Algorithms',
    required_lab_skills: [],
    created_at: '2026-08-05T12:15:00Z'
  }
];
