/**
 * Account search component
 * @module components/accounts/AccountSearch
 */

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@src/store';
import { setSearchQuery } from '@store/slices/accountsSlice';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Search bar for filtering accounts
 */
const AccountSearch: React.FC = () => {
  const dispatch = useDispatch();
  const searchQuery = useSelector((state: RootState) => state.accounts.searchQuery);

  const handleSearchChange = useCallback((_e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchQuery(e.target.value));
  }, [dispatch]);

  const handleClearSearch = useCallback(() => {
    dispatch(setSearchQuery(''));
  }, [dispatch]);

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <input
        type="text"
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search accounts..."
        className="input pl-10 pr-10"
      />
      
      {searchQuery && (
        <button
          onClick={handleClearSearch}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <XMarkIcon className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
      )}
    </div>
  );
};

export default AccountSearch;