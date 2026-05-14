import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';

import {
  User,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
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
  loginWithEmail: (
    email: string,
    pass: string
  ) => Promise<void>;
  registerWithEmail: (
    email: string,
    pass: string,
    name: string,
    accountType?: 'customer' | 'owner'
  ) => Promise<void>;
  updateProfileState: (
    profile: UserProfile
  ) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] =
    useState<User | null>(null);

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let profileUnsubscribe:
      | (() => void)
      | null = null;

    const authUnsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          setUser(firebaseUser);

          // cleanup previous listener
          if (profileUnsubscribe) {
            profileUnsubscribe();
            profileUnsubscribe = null;
          }

          if (firebaseUser) {
            try {
              // check if profile exists
              const userProfile =
                await userService.getUserProfile(
                  firebaseUser.uid
                );

              // create profile if missing
              if (!userProfile) {
                const initialProfile: UserProfile =
                  {
                    uid: firebaseUser.uid,
                    name:
                      firebaseUser.displayName ||
                      'New User',
                    email:
                      firebaseUser.email || '',
                    createdAt:
                      new Date().toISOString()
                  };

                await userService.saveUserProfile(
                  initialProfile
                );
              }

              // realtime profile listener
              profileUnsubscribe =
                onSnapshot(
                  doc(
                    db,
                    'users',
                    firebaseUser.uid
                  ),
                  (docSnap) => {
                    if (docSnap.exists()) {
                      setProfile(
                        docSnap.data() as UserProfile
                      );
                    }

                    setLoading(false);
                  },
                  (error) => {
                    console.error(
                      'Profile listen error:',
                      error
                    );

                    setLoading(false);
                  }
                );
            } catch (error) {
              console.error(
                'User profile setup error:',
                error
              );

              setLoading(false);
            }
          } else {
            setProfile(null);
            setLoading(false);
          }
        }
      );

    return () => {
      authUnsubscribe();

      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider =
      new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      const result =
        await signInWithPopup(
          auth,
          provider
        );

      console.log(
        'Popup login success:',
        result.user.email
      );
    } catch (error: any) {
      if (
        error.code !==
          'auth/popup-closed-by-user' &&
        error.code !==
          'auth/cancelled-popup-request'
      ) {
        console.error(
          'Popup login failed:',
          error.code,
          error.message
        );
      }
    }
  };

  const loginWithEmail = async (
    email: string,
    pass: string
  ) => {
    await signInWithEmailAndPassword(
      auth,
      email,
      pass
    );
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string,
    accountType:
      | 'customer'
      | 'owner' = 'customer'
  ) => {
    const res =
      await createUserWithEmailAndPassword(
        auth,
        email,
        pass
      );

    await updateProfile(res.user, {
      displayName: name
    });

    const userProfile: UserProfile = {
      uid: res.user.uid,
      name,
      email,
      isRestaurantOwner:
        accountType === 'owner',
      createdAt:
        new Date().toISOString()
    };

    await userService.saveUserProfile(
      userProfile
    );

    setProfile(userProfile);
  };

  const updateProfileState = (
    newProfile: UserProfile
  ) => {
    setProfile(newProfile);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        updateProfileState,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};