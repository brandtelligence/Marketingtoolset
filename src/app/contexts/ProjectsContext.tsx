import { createContext, useContext, useState, ReactNode } from 'react';
import { UserProfile } from '../components/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  client: string;
  clientLogo?: string;
  description: string;
  details: string;
  industry: string;
  duration: string;
  teamSize: string;
  image: string;
  route: string;
  tags: string[];
  teamMembers: string[];
  startDate?: string;
  endDate?: string;
  status: 'active' | 'cancelled';
  clientProjectLead: {
    name: string;
    phoneCode: string;
    phoneNumber: string;
    email: string;
    jobTitle: string;
  };
  createdBy?: string;        // email of the user who created the project
  editRequests?: string[];   // emails of users who have requested edit access
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  avatar?: string;
}

// ─── Static Data ──────────────────────────────────────────────────────────────

export const countryCodes = [
  { code: '+1', country: 'United States / Canada' },
  { code: '+7', country: 'Russia / Kazakhstan' },
  { code: '+20', country: 'Egypt' },
  { code: '+27', country: 'South Africa' },
  { code: '+30', country: 'Greece' },
  { code: '+31', country: 'Netherlands' },
  { code: '+32', country: 'Belgium' },
  { code: '+33', country: 'France' },
  { code: '+34', country: 'Spain' },
  { code: '+36', country: 'Hungary' },
  { code: '+39', country: 'Italy' },
  { code: '+40', country: 'Romania' },
  { code: '+41', country: 'Switzerland' },
  { code: '+43', country: 'Austria' },
  { code: '+44', country: 'United Kingdom' },
  { code: '+45', country: 'Denmark' },
  { code: '+46', country: 'Sweden' },
  { code: '+47', country: 'Norway' },
  { code: '+48', country: 'Poland' },
  { code: '+49', country: 'Germany' },
  { code: '+51', country: 'Peru' },
  { code: '+52', country: 'Mexico' },
  { code: '+60', country: 'Malaysia' },
  { code: '+61', country: 'Australia' },
  { code: '+62', country: 'Indonesia' },
  { code: '+63', country: 'Philippines' },
  { code: '+64', country: 'New Zealand' },
  { code: '+65', country: 'Singapore' },
  { code: '+66', country: 'Thailand' },
  { code: '+81', country: 'Japan' },
  { code: '+82', country: 'South Korea' },
  { code: '+84', country: 'Vietnam' },
  { code: '+86', country: 'China' },
  { code: '+90', country: 'Turkey' },
  { code: '+91', country: 'India' },
  { code: '+92', country: 'Pakistan' },
  { code: '+94', country: 'Sri Lanka' },
  { code: '+95', country: 'Myanmar' },
  { code: '+98', country: 'Iran' },
  { code: '+212', country: 'Morocco' },
  { code: '+234', country: 'Nigeria' },
  { code: '+351', country: 'Portugal' },
  { code: '+353', country: 'Ireland' },
  { code: '+358', country: 'Finland' },
  { code: '+420', country: 'Czech Republic' },
  { code: '+852', country: 'Hong Kong' },
  { code: '+853', country: 'Macau' },
  { code: '+880', country: 'Bangladesh' },
  { code: '+886', country: 'Taiwan' },
  { code: '+960', country: 'Maldives' },
  { code: '+961', country: 'Lebanon' },
  { code: '+962', country: 'Jordan' },
  { code: '+965', country: 'Kuwait' },
  { code: '+966', country: 'Saudi Arabia' },
  { code: '+968', country: 'Oman' },
  { code: '+971', country: 'United Arab Emirates' },
  { code: '+972', country: 'Israel' },
  { code: '+973', country: 'Bahrain' },
  { code: '+974', country: 'Qatar' },
  { code: '+977', country: 'Nepal' },
];

export const availableTeamMembers: TeamMember[] = [
  { id: 'tm1', firstName: 'Sarah', lastName: 'Chen', jobTitle: 'Project Manager' },
  { id: 'tm2', firstName: 'Marcus', lastName: 'Johnson', jobTitle: 'UI/UX Designer' },
  { id: 'tm3', firstName: 'Emily', lastName: 'Rodriguez', jobTitle: 'Frontend Developer' },
  { id: 'tm4', firstName: 'David', lastName: 'Kim', jobTitle: 'Backend Developer' },
  { id: 'tm5', firstName: 'Lisa', lastName: 'Anderson', jobTitle: 'Content Strategist' },
  { id: 'tm6', firstName: 'James', lastName: 'Wright', jobTitle: 'Social Media Manager' },
  { id: 'tm7', firstName: 'Priya', lastName: 'Patel', jobTitle: 'Graphic Designer' },
  { id: 'tm8', firstName: 'Alex', lastName: 'Thompson', jobTitle: 'DevOps Engineer' },
  { id: 'tm9', firstName: 'Maya', lastName: 'Lewis', jobTitle: 'Marketing Specialist' },
  { id: 'tm10', firstName: 'Ryan', lastName: 'Foster', jobTitle: 'Full Stack Developer' },
  { id: 'tm11', firstName: 'Sophie', lastName: 'Martinez', jobTitle: 'QA Engineer' },
  { id: 'tm12', firstName: 'Daniel', lastName: 'Brown', jobTitle: 'Data Analyst' },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

export const generateRouteSlug = (name: string): string => {
  if (!name.trim()) return '/projects/untitled';
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `/projects/${slug || 'untitled'}`;
};

export const calculateDuration = (startDate?: string, endDate?: string): string => {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return '';
  const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 30) return diffDays === 1 ? '1 day' : `${diffDays} days`;
  const diffMonths = Math.round(diffDays / 30);
  return diffMonths === 1 ? '1 month' : `${diffMonths} months`;
};

export const getProjectStatus = (
  project: Project
): { type: 'active' | 'cancelled' | 'expired' | 'starting' | 'initiating'; label: string; color: string } => {
  if (project.status === 'cancelled') return { type: 'cancelled', label: 'Cancelled', color: 'bg-red-500' };
  if (!project.startDate || !project.endDate) return { type: 'starting', label: 'Starting Up Project', color: 'bg-orange-500' };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startDate = new Date(project.startDate); startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(project.endDate); endDate.setHours(0, 0, 0, 0);

  if (startDate > today) return { type: 'initiating', label: 'Initiating Project', color: 'bg-sky-400' };
  if (endDate < today) return { type: 'expired', label: 'Expired', color: 'bg-red-500' };
  return { type: 'active', label: 'Active', color: 'bg-green-500' };
};

/** Returns true if the given user has edit permission for this project */
export const canUserEdit = (
  project: Project,
  user: UserProfile | null
): boolean => {
  if (!user) return false;
  // Super admins always have full edit access across all projects
  if (user.userLevel === 'superadmin') return true;
  // Creator always has edit access
  if (project.createdBy === user.email) return true;
  // Check if user's name matches any team member assigned to this project
  return project.teamMembers.some(memberId => {
    const member = availableTeamMembers.find(m => m.id === memberId);
    return (
      member &&
      member.firstName.toLowerCase() === user.firstName.toLowerCase() &&
      member.lastName.toLowerCase() === user.lastName.toLowerCase()
    );
  });
};

/** Returns true if the user has already requested edit access */
export const hasUserRequestedEdit = (project: Project, user: UserProfile | null): boolean => {
  if (!user || !project.editRequests) return false;
  return project.editRequests.includes(user.email);
};

// ─── Initial Data ─────────────────────────────────────────────────────────────

const initialProjects: Project[] = [
  {
    id: '1',
    name: 'vCard SaaS',
    client: 'vCard.brandtelligence.my',
    description: 'Digital Business Card Platform',
    details: 'A comprehensive SaaS platform enabling professionals to create, share, and manage digital business cards with NFC technology, QR codes, and real-time analytics.',
    industry: 'Technology / SaaS',
    duration: '6 months',
    teamSize: '8 members',
    image: 'https://images.unsplash.com/photo-1726607962647-84ec2451d553?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwYnVzaW5lc3MlMjBjYXJkJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NzE4NDg3NTl8MA&ixlib=rb-4.1.0&q=80&w=1080',
    route: '/projects/vcard-saas',
    tags: ['Social Media Marketing', 'Content Strategy', 'Digital Marketing', 'Brand Awareness'],
    teamMembers: ['tm1', 'tm2', 'tm3', 'tm4', 'tm5', 'tm6', 'tm7', 'tm8'],
    status: 'active',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    createdBy: 'sarah.chen@brandtelligence.my',
    clientProjectLead: { name: 'John Doe', phoneCode: '+1', phoneNumber: '1234567890', email: 'john.doe@example.com', jobTitle: 'Project Lead' },
  },
  {
    id: '2',
    name: 'Corporate Rebranding',
    client: 'Tech Innovations Ltd.',
    description: 'Complete Brand Identity Overhaul',
    details: 'Full rebranding initiative including logo redesign, brand guidelines, marketing collateral, and digital presence transformation.',
    industry: 'Technology',
    duration: '4 months',
    teamSize: '12 members',
    image: 'https://images.unsplash.com/photo-1769740333462-9a63bfa914bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB0ZWFtJTIwbWVldGluZyUyMG9mZmljZXxlbnwxfHx8fDE3NzE4MTgwMTR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    route: '/projects/techventures-rebrand',
    tags: ['Branding', 'Design', 'Strategy', 'Visual Identity'],
    teamMembers: ['tm1', 'tm2', 'tm3', 'tm4', 'tm5', 'tm6', 'tm7', 'tm8', 'tm9', 'tm10', 'tm11', 'tm12'],
    status: 'active',
    startDate: '2026-03-01',
    endDate: '2026-08-30',
    createdBy: 'marcus.johnson@brandtelligence.my',
    clientProjectLead: { name: 'Jane Smith', phoneCode: '+1', phoneNumber: '0987654321', email: 'jane.smith@example.com', jobTitle: 'Project Lead' },
  },
  {
    id: '3',
    name: 'E-Commerce Platform',
    client: 'Retail Solutions Group',
    description: 'Full-Stack E-Commerce Solution',
    details: 'Custom-built e-commerce platform with inventory management, payment integration, customer analytics, and omnichannel capabilities.',
    industry: 'Retail / E-Commerce',
    duration: '9 months',
    teamSize: '15 members',
    image: 'https://images.unsplash.com/photo-1764795849878-59b546cfe9c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbmxpbmUlMjBzaG9wcGluZyUyMHJldGFpbCUyMHN0b3JlZnJvbnR8ZW58MXx8fHwxNzcxODk4NjA1fDA&ixlib=rb-4.1.0&q=80&w=1080',
    route: '/projects/shopsphere-e-commerce',
    tags: ['Web Development', 'UX/UI', 'E-Commerce', 'Digital Transformation'],
    teamMembers: ['tm1', 'tm2', 'tm3', 'tm4', 'tm5', 'tm6', 'tm7', 'tm8', 'tm9', 'tm10', 'tm11', 'tm12'],
    status: 'cancelled',
    startDate: '2025-06-01',
    endDate: '2026-03-01',
    createdBy: 'emily.rodriguez@brandtelligence.my',
    clientProjectLead: { name: 'Alice Johnson', phoneCode: '+1', phoneNumber: '5551234567', email: 'alice.johnson@example.com', jobTitle: 'Project Lead' },
  },
  {
    id: '5',
    name: 'Cloud Migration Project',
    client: 'Enterprise Solutions Corp',
    description: 'Infrastructure Modernization',
    details: 'Complete migration of legacy systems to cloud infrastructure with enhanced security, scalability, and performance optimization.',
    industry: 'Cloud Computing',
    duration: '8 months',
    teamSize: '20 members',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    route: '/projects/cloudscale-infrastructure',
    tags: ['Cloud', 'DevOps', 'Infrastructure', 'Migration'],
    teamMembers: ['tm1', 'tm2', 'tm3', 'tm4', 'tm5', 'tm6', 'tm7', 'tm8', 'tm9', 'tm10', 'tm11', 'tm12'],
    status: 'active',
    startDate: '2024-08-01',
    endDate: '2025-12-31',
    createdBy: 'ryan.foster@brandtelligence.my',
    clientProjectLead: { name: 'Sarah Williams', phoneCode: '+44', phoneNumber: '7912345678', email: 'sarah.williams@example.com', jobTitle: 'IT Director' },
  },
  {
    id: '6',
    name: 'Influencer Marketing Campaign',
    client: 'Luxe Retail Brands Sdn. Bhd.',
    description: 'Regional Influencer Strategy & Execution',
    details: 'End-to-end influencer marketing campaign across Southeast Asia, targeting micro and macro influencers to drive brand awareness and product launches for a luxury retail brand.',
    industry: 'Retail / Lifestyle',
    duration: '3 months',
    teamSize: '5 members',
    image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    route: '/projects/luxe-influencer-campaign',
    tags: ['Influencer Marketing', 'Social Media', 'Brand Awareness', 'Southeast Asia'],
    teamMembers: ['tm5', 'tm6', 'tm7', 'tm9', 'tm10'],
    status: 'active',
    startDate: '2026-02-01',
    endDate: '2026-04-30',
    createdBy: 'lisa.anderson@brandtelligence.my',
    clientProjectLead: { name: 'Naomi Tan', phoneCode: '+60', phoneNumber: '123456789', email: 'naomi.tan@luxeretail.my', jobTitle: 'Head of Marketing' },
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

interface ProjectsContextType {
  projects: Project[];
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  requestEditAccess: (projectId: string, userEmail: string) => void;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const addProject = (project: Project) => {
    setProjects(prev => [project, ...prev]);
  };

  const updateProject = (updated: Project) => {
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  };

  const requestEditAccess = (projectId: string, userEmail: string) => {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p;
        const existing = p.editRequests ?? [];
        if (existing.includes(userEmail)) return p;
        return { ...p, editRequests: [...existing, userEmail] };
      })
    );
  };

  return (
    <ProjectsContext.Provider value={{ projects, addProject, updateProject, requestEditAccess }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects(): ProjectsContextType {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    // Return a safe fallback so components can render outside the provider
    return {
      projects: [],
      addProject: () => {},
      updateProject: () => {},
      requestEditAccess: () => {},
    };
  }
  return ctx;
}