/**
 * Employee Profile Page  —  /app/profile
 */

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Camera, Save, Lock, Eye, EyeOff, CheckCircle,
  Building2, Mail, Briefcase, Shield, Loader2,
} from 'lucide-react';
import { useAuth } from '../../components/AuthContext';
import { BackgroundLayout } from '../../components/BackgroundLayout';
import { EmployeeNav } from '../../components/EmployeeNav';
import { supabase } from '../../utils/supabaseClient';
import { IS_PRODUCTION } from '../../config/appConfig';
import { toast } from 'sonner';
import { RoleBadge } from '../../components/saas/StatusBadge';

export function EmployeeProfilePage() {
  const { user, login } = useAuth();

  const [firstName,     setFirstName]     = useState(user?.firstName ?? '');
  const [lastName,      setLastName]      = useState(user?.lastName  ?? '');
  const [avatarSrc,     setAvatarSrc]     = useState(user?.profileImage ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCur,   setShowCur]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showCon,   setShowCon]   = useState(false);
  const [savingPw,  setSavingPw]  = useState(false);

  if (!user) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatarSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim()) { toast.error('First name is required'); return; }
    setSavingProfile(true);
    try {
      const updated = { ...user, firstName, lastName, profileImage: avatarSrc };
      if (IS_PRODUCTION) {
        const { error } = await supabase.auth.updateUser({
          data: { first_name: firstName, last_name: lastName, name: `${firstName} ${lastName}` },
        });
        if (error) throw error;
      }
      login(updated);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(`Failed to save profile: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPw || newPw.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (newPw !== confirmPw)         { toast.error('Passwords do not match'); return; }
    setSavingPw(true);
    try {
      if (IS_PRODUCTION) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
        if (signInErr) throw new Error('Current password is incorrect.');
        const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
        if (updateErr) throw updateErr;
      }
      toast.success('Password changed successfully');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      toast.error(`Password change failed: ${err.message}`);
    } finally {
      setSavingPw(false);
    }
  };

  const pwStrength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^a-zA-Z\d]/.test(pw)) s++;
    return s;
  };
  const strength      = pwStrength(newPw);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength] ?? '';
  const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-teal-500'][strength] ?? '';
  const inputCls = 'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all text-sm';

  return (
    <BackgroundLayout>
      <EmployeeNav />
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

          <div className="mb-6">
            <h1 className="text-white text-2xl font-bold">My Profile</h1>
            <p className="text-white/60 text-sm mt-1">Manage your personal information and password</p>
          </div>

          {/* Profile card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-5 shadow-xl">
            <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-teal-400" /> Personal Information
            </h2>

            <div className="flex items-center gap-5 mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-white/30 overflow-hidden bg-white/10">
                  <img src={avatarSrc} alt={user.firstName} className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border border-white/30 shadow-md"
                  style={{ background: '#0BA4AA' }}
                  title="Change photo"
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">{user.firstName} {user.lastName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <RoleBadge role={user.role ?? 'EMPLOYEE'} />
                  <span className="text-white/50 text-xs">{user.tenantName ?? user.company}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-white/70 text-xs mb-1.5">First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} placeholder="First name" />
              </div>
              <div>
                <label className="block text-white/70 text-xs mb-1.5">Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} placeholder="Last name" />
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { icon: <Mail className="w-4 h-4 text-white/40 shrink-0" />, label: 'Email (read-only)', value: user.email },
                { icon: <Building2 className="w-4 h-4 text-white/40 shrink-0" />, label: 'Organisation', value: user.tenantName ?? user.company },
                { icon: <Briefcase className="w-4 h-4 text-white/40 shrink-0" />, label: 'Role', value: user.jobTitle },
              ].map(field => (
                <div key={field.label} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  {field.icon}
                  <div>
                    <p className="text-white/40 text-[0.65rem] uppercase tracking-wider">{field.label}</p>
                    <p className="text-white text-sm">{field.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveProfile} disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-60"
              style={{ background: '#0BA4AA' }}
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile
            </button>
          </div>

          {/* Change Password card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl">
            <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-400" /> Change Password
            </h2>

            <div className="space-y-4">
              {[
                { label: 'Current Password', value: currentPw, show: showCur, setVal: setCurrentPw, toggleShow: () => setShowCur(v => !v), placeholder: 'Enter current password' },
                { label: 'New Password',     value: newPw,     show: showNew, setVal: setNewPw,     toggleShow: () => setShowNew(v => !v), placeholder: 'Minimum 8 characters' },
                { label: 'Confirm New Password', value: confirmPw, show: showCon, setVal: setConfirmPw, toggleShow: () => setShowCon(v => !v), placeholder: 'Re-enter new password' },
              ].map(field => (
                <div key={field.label}>
                  <label className="block text-white/70 text-xs mb-1.5">{field.label}</label>
                  <div className="relative">
                    <input
                      type={field.show ? 'text' : 'password'} value={field.value}
                      onChange={e => field.setVal(e.target.value)}
                      className={`${inputCls} pr-11`} placeholder={field.placeholder}
                    />
                    <button type="button" onClick={field.toggleShow}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                      {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {field.label === 'New Password' && newPw && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < strength ? strengthColor : 'bg-white/15'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-white/50">Strength: {strengthLabel}</p>
                    </div>
                  )}
                  {field.label === 'Confirm New Password' && confirmPw && (
                    newPw === confirmPw
                      ? <p className="text-xs text-teal-400 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Passwords match</p>
                      : <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                  )}
                </div>
              ))}

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <p className="text-white/50 text-xs leading-relaxed">
                  Use at least 8 characters with a mix of uppercase, lowercase, numbers, and symbols.
                </p>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={savingPw || !currentPw || !newPw || !confirmPw}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-40"
                style={{ background: '#F47A20' }}
              >
                {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Update Password
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </BackgroundLayout>
  );
}
