import React, { useState } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ShieldCheck, UserPlus, Trash2, Mail, Shield, ShieldAlert, Award, Calendar, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminTeamProps {
  isEmbedded?: boolean;
}

export default function AdminTeam({ isEmbedded = false }: AdminTeamProps) {
  const { userRoles, addUserRole, removeUserRole, isSuperAdmin, role } = useAdminAuth();
  
  // State for adding a new user
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'super-admin' | 'manager'>('manager');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [memberToRevoke, setMemberToRevoke] = useState<string | null>(null);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setErrorMsg('Only a Super Admin is authorized to add team members.');
      return;
    }

    if (!newEmail.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      await addUserRole(newEmail.trim(), newRole, newName.trim());
      setSuccessMsg(`Successfully added ${newEmail} as ${newRole === 'super-admin' ? 'Super Admin' : 'Manager'}.`);
      setNewEmail('');
      setNewName('');
      setNewRole('manager');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add team member due to an unknown Firestore error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = (emailId: string) => {
    if (!isSuperAdmin) {
      setErrorMsg('Only a Super Admin is authorized to remove team members.');
      return;
    }
    setMemberToRevoke(emailId);
  };

  const executeRevoke = async () => {
    if (!memberToRevoke) return;
    const emailId = memberToRevoke;
    setMemberToRevoke(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await removeUserRole(emailId);
      setSuccessMsg(`Revoked administrative access for ${emailId}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to revoke permissions.');
    }
  };

  const filteredMembers = userRoles.filter(m => 
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={isEmbedded ? "space-y-6" : "p-6 max-w-7xl mx-auto space-y-6"}>
      {/* Page Title */}
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e3e3e3]">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a1a] flex items-center gap-2">
              <ShieldCheck className="text-black" size={26} />
              Team & Permissions (RBAC)
            </h1>
            <p className="text-xs text-[#616161] mt-1">
              Manage granular dashboard roles and platform control parameters. Your current role: <span className="font-bold underline">{role}</span>.
            </p>
          </div>
        </div>
      )}

      {/* User Alerts */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-md flex items-center gap-2">
          <ShieldAlert size={16} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs px-4 py-3 rounded-md flex items-center gap-2">
          <ShieldCheck size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Create Member Panel (Super-Admin only) */}
        <div className="lg:col-span-1 bg-white p-5 rounded-lg border border-[#e3e3e3] h-fit space-y-4">
          <div className="border-b border-[#f1f1f1] pb-3">
            <h2 className="font-bold text-sm text-[#1a1a1a] flex items-center gap-2">
              <UserPlus size={18} />
              Add Team Member
            </h2>
            <p className="text-[11px] text-[#616161] mt-1">
              Grant secure access roles to Google-authenticated emails.
            </p>
          </div>

          {isSuperAdmin ? (
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#616161] uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Connor"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#f1f1f1] border-none rounded-md py-1.5 px-3 text-xs focus:ring-2 focus:ring-black/10 text-[#1a1a1a]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#616161] uppercase tracking-wider mb-1">
                  Google Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sarah@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[#f1f1f1] border-none rounded-md py-1.5 px-3 text-xs focus:ring-2 focus:ring-black/10 text-[#1a1a1a]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#616161] uppercase tracking-wider mb-1">
                  Assigned Authority Role
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewRole('manager')}
                    className={`p-2.5 rounded-md border text-center transition-all ${
                      newRole === 'manager'
                        ? 'border-black bg-black text-white'
                        : 'border-[#e3e3e3] bg-white text-[#1a1a1a] hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-xs font-bold">Manager</span>
                    <span className="text-[9px] opacity-80 block mt-0.5">Read/Write Core Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('super-admin')}
                    className={`p-2.5 rounded-md border text-center transition-all ${
                      newRole === 'super-admin'
                        ? 'border-black bg-black text-white'
                        : 'border-[#e3e3e3] bg-white text-[#1a1a1a] hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-xs font-bold">Super Admin</span>
                    <span className="text-[9px] opacity-80 block mt-0.5">Full Workspace Control</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-black text-white py-2 rounded-md font-bold text-xs hover:bg-black/90 transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
              >
                <UserPlus size={14} />
                {submitting ? 'Updating Directory...' : 'Authorize Member'}
              </button>
            </form>
          ) : (
            <div className="p-4 bg-amber-50 rounded-md border border-amber-200 text-amber-900 text-xs">
              <p className="font-bold mb-1">Limited Permission Manager Account</p>
              <p className="text-[11px]">Managers cannot delegate authority or invite other emails. Only a Super Admin (e.g. evolvewebandai@gmail.com) can execute directory creations.</p>
            </div>
          )}

          {/* Granular RBAC documentation block */}
          <div className="border-t border-[#f1f1f1] pt-4 space-y-2.5">
            <h3 className="text-xs font-bold text-[#1a1a1a]">RBAC Authorization Grid</h3>
            
            <div className="space-y-1.5 text-xs">
              <div className="flex gap-2 p-2 bg-[#f1f1f1] rounded-md">
                <Award size={14} className="text-[#1a1a1a] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[11px] text-[#1a1a1a]">Super Admin Scope</p>
                  <p className="text-[9.5px] text-[#616161]">Full access to analytics, orders, products, discounts. Edit billing configurations, and create or revoke administrative member profiles.</p>
                </div>
              </div>

              <div className="flex gap-2 p-2 bg-[#f1f1f1] rounded-md">
                <Shield size={14} className="text-[#1a1a1a] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[11px] text-[#1a1a1a]">Manager Scope</p>
                  <p className="text-[9.5px] text-[#616161]">Full access to products inventory, managing checkouts, fulfilling client orders, and reading discounts. Cannot edit user profiles or team permissions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Members Directory List */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#e3e3e3] flex flex-col overflow-hidden">
          
          {/* List Search & Header */}
          <div className="p-4 border-b border-[#e3e3e3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-bold text-sm text-[#1a1a1a]">
              Active Administrative Directory ({filteredMembers.length})
            </h2>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#616161]" size={14} />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f1f1f1] border-none rounded-md py-1 px-8 text-xs focus:ring-1 focus:ring-black/10 text-[#1a1a1a]"
              />
            </div>
          </div>

          {/* Directory Grid */}
          <div className="flex-1 overflow-x-auto">
            {filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Mail size={32} className="text-gray-300 mb-2" />
                <p className="text-xs font-bold text-[#1a1a1a]">No matching members found</p>
                <p className="text-[11px] text-[#616161] mt-0.5">Adjust filter criteria or create a user identity.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-[#1a1a1a] border-collapse">
                <thead>
                  <tr className="bg-[#f9f9f9] border-b border-[#e3e3e3] text-[#616161] font-bold">
                    <th className="p-3.5 pl-6">Participant Identity</th>
                    <th className="p-3.5">Assigned Role</th>
                    <th className="p-3.5 hidden md:table-cell">Authorization Date</th>
                    <th className="p-3.5 text-right pr-6">Management Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1f1]">
                  {filteredMembers.map((member) => {
                    const isRootCreator = member.email.toLowerCase() === 'evolvewebandai@gmail.com';
                    return (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3.5 pl-6 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white uppercase shrink-0 ${
                            member.role === 'super-admin' ? 'bg-black' : 'bg-zinc-500'
                          }`}>
                            {member.name?.charAt(0) || member.email.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-[#1a1a1a]">{member.name || 'Anonymous User'}</p>
                            <p className="text-[10px] text-[#616161] font-mono">{member.email}</p>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {member.role === 'super-admin' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 border border-green-200 text-green-700">
                              <ShieldCheck size={11} />
                              Super Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 border border-blue-200 text-blue-700">
                              <Shield size={11} />
                              Manager
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-xs text-[#616161] hidden md:table-cell">
                          <span className="flex items-center gap-1.5 font-mono">
                            <Calendar size={12} />
                            {member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'Bootstrap Seed'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right pr-6">
                          {isRootCreator ? (
                            <span className="text-[10px] font-mono text-zinc-400 italic">Protected System Owner</span>
                          ) : isSuperAdmin ? (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                              title="Revoke active clearance"
                            >
                              <Trash2 size={15} />
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-400">Restricted Action</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Revoke Permission Confirmation Modal */}
      <AnimatePresence>
        {memberToRevoke && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMemberToRevoke(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />
            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-white border border-[#e3e3e3] rounded-lg shadow-2xl overflow-hidden z-20 text-left"
            >
              <div className="p-6 border-b border-[#f1f1f1] flex justify-between items-center">
                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider font-mono">Revoke Administrative Access</h3>
                <button 
                  onClick={() => setMemberToRevoke(null)}
                  className="p-1 hover:bg-[#f1f1f1] rounded text-[#616161] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-[#1a1a1a] leading-relaxed">
                  Are you sure you want to revoke admin panel access for <span className="font-bold">"{memberToRevoke}"</span>? Once removed, they will no longer be able to log in to edit products, view order logs, or manage discounts.
                </p>
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded text-amber-800 text-[11px] leading-normal">
                  <ShieldAlert size={16} className="shrink-0" />
                  <span>The user will immediately be signed out of any active management panels.</span>
                </div>
              </div>
              <div className="p-4 bg-[#f9f9f9] border-t border-[#e3e3e3] flex justify-end gap-2.5">
                <button
                  onClick={() => setMemberToRevoke(null)}
                  className="bg-white border border-[#d1d1d1] text-[#1a1a1a] px-4.5 py-2 rounded-md text-xs font-bold hover:bg-[#f6f6f6] active:scale-98 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={executeRevoke}
                  className="bg-red-600 hover:bg-red-700 text-white px-4.5 py-2 rounded-md text-xs font-bold active:scale-98 transition-all shadow-sm"
                >
                  Revoke Access
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
