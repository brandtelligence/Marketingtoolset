import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, Upload, AlertCircle, UserPlus, Trash2,
  Phone, Mail, User,
} from 'lucide-react';
import { CountryCodeSelector } from './CountryCodeSelector';
import {
  Project, TeamMember, countryCodes, availableTeamMembers,
  generateRouteSlug, calculateDuration, getProjectStatus,
} from '../contexts/ProjectsContext';
import { useDashboardTheme } from './saas/DashboardThemeContext';

interface EditProjectModalProps {
  project: Project;
  onSave: (updated: Project) => void;
  onClose: () => void;
  /** If true, shows "Cancel Project" button (employee-level only) */
  showCancelProject?: boolean;
  /** 'create' shows "Add New Project" header; default is 'edit' */
  mode?: 'create' | 'edit';
}

export function EditProjectModal({ project, onSave, onClose, showCancelProject = false, mode = 'edit' }: EditProjectModalProps) {
  const { isDark } = useDashboardTheme();
  const [form, setForm] = useState<Project>({
    ...project,
    clientProjectLead: project.clientProjectLead ?? {
      name: '', phoneCode: '+1', phoneNumber: '', email: '', jobTitle: '',
    },
  });
  const [imageUploadError, setImageUploadError] = useState('');

  const status = getProjectStatus(form);

  // Standard card image dimensions (16:9 landscape)
  const STANDARD_WIDTH = 800;
  const STANDARD_HEIGHT = 450;

  /** Crop & resize an image file to the standard card dimensions using canvas */
  const cropImageToStandard = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = STANDARD_WIDTH;
          canvas.height = STANDARD_HEIGHT;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas not supported')); return; }

          // Center-crop: scale to cover the target area, then draw centered
          const targetRatio = STANDARD_WIDTH / STANDARD_HEIGHT;
          const imgRatio = img.width / img.height;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;

          if (imgRatio > targetRatio) {
            // Image is wider — crop sides
            sw = img.height * targetRatio;
            sx = (img.width - sw) / 2;
          } else {
            // Image is taller — crop top/bottom
            sh = img.width / targetRatio;
            sy = (img.height - sh) / 2;
          }

          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, STANDARD_WIDTH, STANDARD_HEIGHT);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleTagsChange = (raw: string) => {
    setForm({ ...form, tags: raw.split(',').map(t => t.trim()).filter(Boolean) });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setImageUploadError('Only JPEG and PNG files are allowed');
      e.target.value = '';
      return;
    }
    if (file.size > 1048576) {
      setImageUploadError('File size must be less than 1MB');
      e.target.value = '';
      return;
    }
    setImageUploadError('');
    cropImageToStandard(file)
      .then(croppedDataUrl => setForm({ ...form, image: croppedDataUrl }))
      .catch(() => {
        // Fallback to raw data URL if cropping fails
        const reader = new FileReader();
        reader.onloadend = () => setForm({ ...form, image: reader.result as string });
        reader.readAsDataURL(file);
      });
  };

  const addMember = (member: TeamMember) => {
    const updated = [...form.teamMembers, member.id];
    setForm({ ...form, teamMembers: updated, teamSize: `${updated.length} ${updated.length === 1 ? 'member' : 'members'}` });
  };

  const removeMember = (id: string) => {
    const updated = form.teamMembers.filter(m => m !== id);
    setForm({ ...form, teamMembers: updated, teamSize: `${updated.length} ${updated.length === 1 ? 'member' : 'members'}` });
  };

  const handleCancelProject = () => {
    const updated = { ...form, status: 'cancelled' as const };
    onSave(updated);
  };

  const handleSave = () => {
    const route = generateRouteSlug(form.name);
    onSave({ ...form, route });
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="fixed inset-2 sm:inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:max-h-[90vh] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl z-50 flex flex-col fold-modal-safe"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:p-8 border-b border-white/20 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              {mode === 'create' ? 'Add New Project' : 'Edit Project'}
            </h2>
            {mode === 'edit' && (
              <span className={`${status.color} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                {status.label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          <div className="space-y-5">

            {/* Project Name */}
            <div>
              <label className="block text-white/90 mb-2 text-sm font-medium">Project Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                placeholder="Enter project name"
              />
            </div>

            {/* Client */}
            <div>
              <label className="block text-white/90 mb-2 text-sm font-medium">Client</label>
              <input
                type="text"
                value={form.client}
                onChange={e => setForm({ ...form, client: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                placeholder="Enter client name"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-white/90 mb-2 text-sm font-medium">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                placeholder="Enter short description"
              />
            </div>

            {/* Details */}
            <div>
              <label className="block text-white/90 mb-2 text-sm font-medium">Details</label>
              <textarea
                value={form.details}
                onChange={e => setForm({ ...form, details: e.target.value })}
                rows={4}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all resize-none"
                placeholder="Enter detailed description"
              />
            </div>

            {/* Industry + Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium">Industry</label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={e => setForm({ ...form, industry: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="e.g., Technology"
                />
              </div>
              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium">
                  Duration
                  {form.startDate && form.endDate && (
                    <span className="ml-2 text-white/50 font-normal text-xs">(auto-calculated)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={form.duration}
                  onChange={e => setForm({ ...form, duration: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="e.g., 6 months"
                  readOnly={!!(form.startDate && form.endDate)}
                />
              </div>
            </div>

            {/* Start Date + End Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={form.startDate || ''}
                  onChange={e => {
                    const d = calculateDuration(e.target.value, form.endDate);
                    setForm({ ...form, startDate: e.target.value, duration: d || form.duration });
                  }}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/40 transition-all [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium">End Date</label>
                <input
                  type="date"
                  value={form.endDate || ''}
                  onChange={e => {
                    const d = calculateDuration(form.startDate, e.target.value);
                    setForm({ ...form, endDate: e.target.value, duration: d || form.duration });
                  }}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/40 transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Team Members */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-white/90 text-sm font-medium">Team Members</label>
                <div className="text-sm text-white/70 bg-white/10 px-3 py-1 rounded-lg border border-white/20">
                  {form.teamMembers.length} {form.teamMembers.length === 1 ? 'member' : 'members'}
                </div>
              </div>

              {/* Selected */}
              <div className="mb-4 max-h-64 overflow-y-auto space-y-2 bg-white/5 border border-white/20 rounded-xl p-4">
                {form.teamMembers.length === 0 ? (
                  <div className="text-white/50 text-sm text-center py-4">No team members selected</div>
                ) : (
                  form.teamMembers.map(memberId => {
                    const member = availableTeamMembers.find(m => m.id === memberId);
                    if (!member) return null;
                    return (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between bg-white/10 border border-white/20 rounded-xl p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {member.firstName[0]}{member.lastName[0]}
                          </div>
                          <div>
                            <div className="text-white font-medium text-sm">{member.firstName} {member.lastName}</div>
                            <div className="text-white/60 text-xs">{member.jobTitle}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeMember(member.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Available to add */}
              <div className="bg-white/10 border border-white/20 rounded-xl p-4">
                <div className="text-white/90 text-sm font-medium mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add Team Members
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableTeamMembers
                    .filter(m => !form.teamMembers.includes(m.id))
                    .map(member => (
                      <button
                        key={member.id}
                        onClick={() => addMember(member)}
                        className="flex items-center gap-3 bg-white/5 border border-white/20 rounded-xl p-3 hover:bg-white/15 hover:border-white/30 transition-all text-left"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                          {member.firstName[0]}{member.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">{member.firstName} {member.lastName}</div>
                          <div className="text-white/60 text-xs truncate">{member.jobTitle}</div>
                        </div>
                      </button>
                    ))}
                </div>
                {availableTeamMembers.filter(m => !form.teamMembers.includes(m.id)).length === 0 && (
                  <div className="text-white/50 text-sm text-center py-4">All team members already added</div>
                )}
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-white/90 mb-3 text-sm font-medium">Project Image</label>
              {form.image && (
                <div className="mb-4 rounded-xl overflow-hidden bg-white/5 border border-white/20">
                  <img src={form.image} alt="Preview" className="w-full h-48 object-cover" />
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <input type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleImageUpload} className="hidden" id="editImageUpload" />
                  <label htmlFor="editImageUpload" className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all cursor-pointer">
                    <Upload className="w-5 h-5" />
                    Upload Image
                  </label>
                  <span className="text-white/60 text-xs">Max 1MB, JPEG or PNG — auto-cropped to 800×450 (16:9)</span>
                </div>
                {imageUploadError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {imageUploadError}
                  </motion.div>
                )}
                <div className="flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-white/20" />
                  <span className="text-white/60 text-sm font-medium">OR</span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-white/90 mb-2 text-sm font-medium">Image URL</label>
              <input
                type="text"
                value={form.image}
                onChange={e => setForm({ ...form, image: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                placeholder="https://..."
              />
            </div>

            {/* Route (auto-generated) */}
            <div>
              <label className="block text-white/90 mb-2 text-sm font-medium">
                Route <span className="text-white/50 font-normal">(auto-generated from project name)</span>
              </label>
              <input
                type="text"
                value={generateRouteSlug(form.name)}
                readOnly
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/70 cursor-not-allowed focus:outline-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-white/90 mb-2 text-sm font-medium">Tags (comma-separated)</label>
              <input
                type="text"
                value={form.tags.join(', ')}
                onChange={e => handleTagsChange(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                placeholder="Tag 1, Tag 2, Tag 3"
              />
            </div>

            {/* Client Project Lead */}
            <div className="bg-white/5 border-2 border-white/30 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-white/20">
                <div className="p-2 bg-white/10 rounded-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Client Project Lead</h3>
                  <p className="text-xs text-white/60">All fields are mandatory</p>
                </div>
              </div>

              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium">Full Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.clientProjectLead.name}
                  onChange={e => setForm({ ...form, clientProjectLead: { ...form.clientProjectLead, name: e.target.value } })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium">Job Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.clientProjectLead.jobTitle}
                  onChange={e => setForm({ ...form, clientProjectLead: { ...form.clientProjectLead, jobTitle: e.target.value } })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="e.g., Project Manager"
                />
              </div>

              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Mobile Phone <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <CountryCodeSelector
                      value={form.clientProjectLead.phoneCode}
                      onChange={code => setForm({ ...form, clientProjectLead: { ...form.clientProjectLead, phoneCode: code } })}
                      countryCodes={countryCodes}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="tel"
                      value={form.clientProjectLead.phoneNumber}
                      onChange={e => setForm({ ...form, clientProjectLead: { ...form.clientProjectLead, phoneNumber: e.target.value } })}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                      placeholder="1234567890"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.clientProjectLead.email}
                  onChange={e => setForm({ ...form, clientProjectLead: { ...form.clientProjectLead, email: e.target.value } })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="email@example.com"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Footer — responsive: stacked on mobile, row on sm+ */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-6 md:p-8 border-t border-white/20 flex-shrink-0">
          <div>
            {mode === 'edit' && showCancelProject && form.status === 'active' && (
              <motion.button
                onClick={handleCancelProject}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl hover:bg-red-500/30 transition-all inline-flex items-center justify-center gap-2 min-h-[2.75rem]"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                Cancel Project
              </motion.button>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all min-h-[2.75rem]"
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={handleSave}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-teal-600 rounded-xl hover:shadow-2xl transition-all shadow-lg inline-flex items-center justify-center gap-2 min-h-[2.75rem]"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              {mode === 'create' ? 'Create Project' : 'Save Changes'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}