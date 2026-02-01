import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Grade {
  id: string;
  code: string;
  label: string;
  rank_order: number;
  can_manage_team: boolean;
  can_view_all_data: boolean;
  can_approve_accounts: boolean;
  can_force_checkout: boolean;
  can_export_reports: boolean;
}

interface Profile {
  id: string;
  auth_id: string;
  nom: string;
  postnom: string | null;
  prenom: string;
  email: string;
  telephone: string | null;
  fonction: string | null;
  service: string | null;
  statut: 'actif' | 'suspendu';
  photo_url: string | null;
  grade_id: string | null;
  custom_grade: string | null;
  manager_id: string | null;
  account_status: 'pending_approval' | 'active' | 'suspended' | 'rejected';
}

interface UserRole {
  role: 'admin' | 'president' | 'chef_service' | 'agent';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  grade: Grade | null;
  roles: UserRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasGrade: (gradeCode: string) => boolean;
  isAdmin: boolean;
  isPresident: boolean;
  isChefService: boolean;
  isChefBureau: boolean;
  isChefDivision: boolean;
  canManageTeam: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (authId: string) => {
    try {
      setLoading(true);
      
      // Fetch profile with grade
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          grade:grades(*)
        `)
        .eq('auth_id', authId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setLoading(false);
        return;
      }

      // Extract grade from joined data
      const gradeData = profileData.grade as Grade | null;
      const profileWithoutGrade = { ...profileData, grade: undefined } as Profile;
      
      setProfile(profileWithoutGrade);
      setGrade(gradeData);

      // Fetch roles from user_roles table
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profileData.id);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      } else {
        setRoles(rolesData as UserRole[]);
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Allow manual refresh of user data (useful after login)
  const refreshUserData = useCallback(async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Use setTimeout to prevent potential race conditions
        setTimeout(() => {
          fetchUserData(session.user.id);
        }, 100);
      } else {
        setProfile(null);
        setGrade(null);
        setRoles([]);
        setLoading(false);
      }
    });

    // THEN check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setGrade(null);
    setRoles([]);
  };

  const hasRole = (role: string) => {
    return roles.some(r => r.role === role);
  };

  // Check if user has a specific grade by code
  const hasGrade = (gradeCode: string) => {
    return grade?.code === gradeCode;
  };

  // Role-based checks
  const isAdmin = hasRole('admin');
  const isPresident = hasRole('president') || isAdmin;
  
  // Chef Service includes both chef_division and chef_bureau based on role OR grade
  const isChefService = hasRole('chef_service') || isPresident;
  
  // Specific grade checks for fine-grained control
  const isChefBureau = hasGrade('chef_bureau') || hasRole('chef_service');
  const isChefDivision = hasGrade('chef_division') || isChefBureau;
  
  // Permission-based checks using grade permissions
  const canManageTeam = grade?.can_manage_team || isChefService || isAdmin;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      grade,
      roles,
      loading,
      signOut,
      refreshUserData,
      hasRole,
      hasGrade,
      isAdmin,
      isPresident,
      isChefService,
      isChefBureau,
      isChefDivision,
      canManageTeam,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
