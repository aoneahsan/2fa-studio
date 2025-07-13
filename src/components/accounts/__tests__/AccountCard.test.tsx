import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '@src/test/utils';
import AccountCard from '@components/accounts/AccountCard';
import { OTPAccount } from '@services/otp.service';

// Mock the OTP service
vi.mock('../../../services/otp.service', () => ({
  OTPService: {
    generateCode: vi.fn(() => ({
      code: '123456',
      remainingTime: 25,
      progress: 83,
    })),
    generateTOTP: vi.fn(() => ({
      code: '123456',
      remainingTime: 25,
      progress: 83,
    })),
    generateHOTP: vi.fn(() => ({
      code: '654321',
    })),
    formatCode: vi.fn((code) => `${code.slice(0, 3)} ${code.slice(3)}`),
  },
}));

describe('AccountCard', () => {
  const mockTOTPAccount: OTPAccount = {
    id: '1',
    issuer: 'Google',
    label: 'test@gmail.com',
    secret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    type: 'totp',
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['work', 'important'],
  };

  const mockHOTPAccount: OTPAccount = {
    ...mockTOTPAccount,
    id: '2',
    type: 'hotp',
    counter: 5,
  };

  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleFavorite: vi.fn(),
    onCopyCode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TOTP Account', () => {
    it('should render account information correctly', () => {
      render(<AccountCard account={mockTOTPAccount} {...mockHandlers} />);
      
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('test@gmail.com')).toBeInTheDocument();
      expect(screen.getByText('123456')).toBeInTheDocument();
    });

    it('should display tags', () => {
      render(<AccountCard account={mockTOTPAccount} {...mockHandlers} />);
      
      expect(screen.getByText('work')).toBeInTheDocument();
      expect(screen.getByText('important')).toBeInTheDocument();
    });

    it('should show countdown timer', () => {
      render(<AccountCard account={mockTOTPAccount} {...mockHandlers} />);
      
      expect(screen.getByText('25s')).toBeInTheDocument();
    });

    it('should copy code when clicked', async () => {
      render(<AccountCard account={mockTOTPAccount} {...mockHandlers} />);
      
      const codeButton = screen.getByText('123456');
      fireEvent.click(codeButton);
      
      await waitFor(() => {
        expect(mockHandlers.onCopyCode).toHaveBeenCalledWith('123456');
      });
    });

    it('should call edit handler when edit button clicked', () => {
      render(<AccountCard account={mockTOTPAccount} {...mockHandlers} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockTOTPAccount);
    });

    it('should call delete handler when delete button clicked', () => {
      render(<AccountCard account={mockTOTPAccount} {...mockHandlers} />);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      
      expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockTOTPAccount);
    });
  });

  describe('HOTP Account', () => {
    it('should render HOTP account correctly', () => {
      render(<AccountCard account={mockHOTPAccount} {...mockHandlers} />);
      
      expect(screen.getByText('654321')).toBeInTheDocument();
      expect(screen.getByText('Counter: 5')).toBeInTheDocument();
    });

    it('should not show countdown timer for HOTP', () => {
      render(<AccountCard account={mockHOTPAccount} {...mockHandlers} />);
      
      expect(screen.queryByText(/\d+s/)).not.toBeInTheDocument();
    });
  });

  describe('Favorite functionality', () => {
    it('should show favorite icon when account is favorite', () => {
      const favoriteAccount = {
        ...mockTOTPAccount,
        isFavorite: true,
      };
      
      render(<AccountCard account={favoriteAccount} {...mockHandlers} />);
      
      const favoriteButton = screen.getByRole('button', { name: /favorite/i });
      expect(favoriteButton).toHaveClass('text-yellow-500'); // Assuming favorite state has this class
    });

    it('should call toggle favorite handler', () => {
      render(<AccountCard account={mockTOTPAccount} {...mockHandlers} />);
      
      const favoriteButton = screen.getByRole('button', { name: /favorite/i });
      fireEvent.click(favoriteButton);
      
      expect(mockHandlers.onToggleFavorite).toHaveBeenCalledWith(mockTOTPAccount);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels', () => {
      render(<AccountCard account={mockTOTPAccount} {...mockHandlers} />);
      
      expect(screen.getByRole('button', { name: /copy code/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle favorite/i })).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<AccountCard account={mockTOTPAccount} {...mockHandlers} />);
      
      const codeButton = screen.getByText('123456');
      codeButton.focus();
      
      fireEvent.keyDown(codeButton, { key: 'Enter' });
      expect(mockHandlers.onCopyCode).toHaveBeenCalled();
    });
  });
});