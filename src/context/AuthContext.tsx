import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { 
  User, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { userService } from '../services/firebaseService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, accountType?: 'customer' | 'owner') => Promise<void>;
  updateProfileState: (profile: UserProfile) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    // STEP 1: handle the result of Google redirect FIRST
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Google redirect success:', result.user.email);
        }
      })
      .catch((error) => {
        console.error('getRedirectResult error:', error.code, error.message);
      });

    // STEP 2: listen for auth state changes
    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (firebaseUser) {
        const userProfile = await userService.getUserProfile(firebaseUser.uid);
        if (!userProfile) {
          const initialProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'New User',
            email: firebaseUser.email || '',
            createdAt: new Date().toISOString()
          };
          await userService.saveUserProfile(initialProfile);
        }

        profileUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
          setLoading(false);
        }, (error) => {
          console.error('Profile listen error:', error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithRedirect(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name: string, accountType: 'customer' | 'owner' = 'customer') => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(res.user, { displayName: name });
    const userProfile: UserProfile = {
      uid: res.user.uid,
      name: name,
      email: email,
      isRestaurantOwner: accountType === 'owner',
      createdAt: new Date().toISOString()
    };
    await userService.saveUserProfile(userProfile);
    setProfile(userProfile);
  };

  const updateProfileState = (newProfile: UserProfile) => {
    setProfile(newProfile);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      loginWithGoogle, 
      loginWithEmail, 
      registerWithEmail, 
      updateProfileState,
      logout 
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