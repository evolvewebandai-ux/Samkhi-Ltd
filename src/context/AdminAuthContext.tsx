import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { auth } from '../lib/auth';
import { db, handleFirestoreError, OperationType, cleanUndefined } from '../firebase';
import { UserRole } from '../types';

interface AdminAuthContextType {
  user: User | null;
  role: 'super-admin' | 'manager' | null;
  loading: boolean;
  userRoles: UserRole[];
  addUserRole: (email: string, role: 'super-admin' | 'manager', name?: string) => Promise<void>;
  removeUserRole: (id: string) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isSuperAdmin: boolean;
  isManager: boolean;
  isAdmin: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAIL = 'evolvewebandai@gmail.com';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'super-admin' | 'manager' | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);

  // 1. Follow Auth State Changes
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setRole(null);
        setUserRoles([]);
        setLoading(false);
        return;
      }

      // Read current role from user_roles collection or hardcoded default for the creator
      const emailLower = currentUser.email?.toLowerCase() || '';
      
      // Fallback/Bootstrap rule for creator
      if (emailLower === SUPER_ADMIN_EMAIL.toLowerCase()) {
        setRole('super-admin');
        
        // Auto-seed/verify document exists in DB
        const roleDocRef = doc(db, 'user_roles', emailLower);
        try {
          const snap = await getDoc(roleDocRef);
          if (!snap.exists()) {
            await setDoc(roleDocRef, {
              id: emailLower,
              email: SUPER_ADMIN_EMAIL,
              role: 'super-admin',
              name: currentUser.displayName || 'Super Admin',
              createdAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.warn("Bootstrap user role seeding skipped:", e);
        }
        setLoading(false);
        return;
      }

      // Check Firestore for user role
      try {
        const roleDocRef = doc(db, 'user_roles', emailLower);
        const snap = await getDoc(roleDocRef);
        if (snap.exists()) {
          const data = snap.data() as UserRole;
          setRole(data.role);
        } else {
          setRole(null); // unauthorized guest
        }
      } catch (err) {
        console.error("Error reading user role from DB:", err);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, []);

  // 2. Load all User Roles for Team Management (if they are authorized)
  useEffect(() => {
    if (!user || !role) {
      setUserRoles([]);
      return;
    }

    const rolesColl = collection(db, 'user_roles');
    const unsubSnapshot = onSnapshot(rolesColl, (snapshot) => {
      const list: UserRole[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as UserRole);
      });
      setUserRoles(list);
    }, (error) => {
      console.warn("User does not have access to retrieve team roles list:", error.message);
    });

    return () => unsubSnapshot();
  }, [user, role]);

  // Login handler
  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login popup failed", error);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Add a user role
  const addUserRole = async (email: string, targetRole: 'super-admin' | 'manager', name?: string) => {
    if (role !== 'super-admin') {
      throw new Error('Only Super Admins can add or modify member roles.');
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    const data: UserRole = {
      id: cleanEmail,
      email: cleanEmail,
      role: targetRole,
      name: name || cleanEmail.split('@')[0],
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'user_roles', cleanEmail), cleanUndefined(data));
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `user_roles/${cleanEmail}`);
    }
  };

  // Remove a user role
  const removeUserRole = async (emailId: string) => {
    if (role !== 'super-admin') {
      throw new Error('Only Super Admins can remove member roles.');
    }
    const cleanId = emailId.trim().toLowerCase();
    if (cleanId === SUPER_ADMIN_EMAIL.toLowerCase()) {
      throw new Error('Cannot delete the root Super Admin bootstrap user.');
    }

    try {
      await deleteDoc(doc(db, 'user_roles', cleanId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `user_roles/${cleanId}`);
    }
  };

  const isSuperAdmin = role === 'super-admin';
  const isManager = role === 'manager';
  const isAdmin = isSuperAdmin || isManager;

  return (
    <AdminAuthContext.Provider value={{
      user,
      role,
      loading,
      userRoles,
      addUserRole,
      removeUserRole,
      login,
      logout,
      isSuperAdmin,
      isManager,
      isAdmin
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
