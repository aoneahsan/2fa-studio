/**
 * Card Component using buildkit-ui
 * @module components/ui/card-buildkit
 */

import React from 'react';
import { Card as BuildKitCard, cn } from 'buildkit-ui';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Enhanced Card component using buildkit-ui
 * Maintains API compatibility with existing Card component
 */
export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <BuildKitCard className={className} {...props}>
      {children}
    </BuildKitCard>
  );
};

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className, ...props }) => {
  return (
    <div 
      className={cn("px-6 py-4 border-b border-gray-200 dark:border-gray-700", className)}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className, ...props }) => {
  return (
    <h3 
      className={cn("text-lg font-semibold text-gray-900 dark:text-white", className)}
      {...props}
    >
      {children}
    </h3>
  );
};

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className, ...props }) => {
  return (
    <div 
      className={cn("px-6 py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className, ...props }) => {
  return (
    <p 
      className={cn("text-sm text-gray-600 dark:text-gray-400", className)}
      {...props}
    >
      {children}
    </p>
  );
};

// Export all Card components for easy access
export default {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
};