/**
 * Profile settings component
 * @module components/settings/ProfileSettings
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@src/store';
import { setUser } from '@store/slices/authSlice';
import { addToast } from '@store/slices/uiSlice';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { _auth, db } from '@src/config/firebase';
import { CameraIcon, UserCircleIcon } from '@heroicons/react/24/outline';

/**
 * Profile settings tab component
 */
const ProfileSettings: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state._auth);
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');

  const handleUpdateProfile = async (_e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser || !user) return;

    setIsLoading(true);

    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: displayName || null,
        photoURL: photoURL || null
      });

      // Update Firestore document
      const userId = user.uid || user.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      await updateDoc(doc(db, 'users', userId), {
        displayName,
        photoURL,
        updatedAt: new Date()
      });

      // Update Redux state
      dispatch(setUser({
        ...user,
        displayName,
        photoURL,
        updatedAt: new Date()
      }));

      dispatch(addToast({
        type: 'success',
        message: 'Profile updated successfully'
      }));
    } catch (_error) {
      console.error('Profile update _error:', _error);
      dispatch(addToast({
        type: 'error',
        message: 'Failed to update profile'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (_e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real app, you would upload to Firebase Storage
    // For now, we'll just show a message
    dispatch(addToast({
      type: 'info',
      message: 'Photo upload feature coming soon'
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Profile Information</h2>
        <p className="text-sm text-muted-foreground">
          Update your personal information and profile picture
        </p>
      </div>

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        {/* Profile Picture */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-4">
            Profile Picture
          </label>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                  <UserCircleIcon className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
              
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <CameraIcon className="w-4 h-4" />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>Upload a new profile picture</p>
              <p>JPG, PNG or GIF. Max 5MB.</p>
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="input opacity-50 cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Email cannot be changed
          </p>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(_e) => setDisplayName(e.target.value)}
            className="input"
            placeholder="Enter your name"
          />
        </div>

        {/* Account Info */}
        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-medium text-foreground mb-4">Account Information</h3>
          
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">User ID</dt>
              <dd className="text-sm font-mono text-foreground">{user?.uid}</dd>
            </div>
            
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Account Type</dt>
              <dd className="text-sm text-foreground capitalize">
                {user?.subscription.type} 
                {user?.subscription.type === 'free' && (
                  <span className="ml-2 text-xs text-primary cursor-pointer hover:underline">
                    Upgrade
                  </span>
                )}
              </dd>
            </div>
            
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Account Created</dt>
              <dd className="text-sm text-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </dd>
            </div>
            
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Last Updated</dt>
              <dd className="text-sm text-foreground">
                {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-6">
          <button
            type="button"
            className="text-sm text-red-600 hover:text-red-700"
          >
            Delete Account
          </button>
          
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;