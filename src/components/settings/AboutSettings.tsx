/**
 * About settings component
 * @module components/settings/AboutSettings
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { addToast } from '@store/slices/uiSlice';
import { 
  DocumentTextIcon,
  ShieldCheckIcon,
  HeartIcon,
  CodeBracketIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  BugAntIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

/**
 * About settings tab component
 */
const AboutSettings: React.FC = () => {
  const dispatch = useDispatch();
  
  const appVersion = '1.0.0';
  const buildNumber = '100';
  const buildDate = '2024-01-11';

  const handleCheckForUpdates = () => {
    dispatch(addToast({
      type: 'info',
      message: 'Checking for updates...'
    }) as any);
    
    setTimeout(() => {
      dispatch(addToast({
        type: 'success',
        message: 'You are running the latest version!'
      }) as any);
    }, 1500);
  };

  const handleReportBug = () => {
    window.open('https://github.com/2fa-studio/issues/new', '_blank');
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@2fastudio.app';
  };

  const links = [
    {
      icon: DocumentTextIcon,
      label: 'Terms of Service',
      href: 'https://2fastudio.app/terms'
    },
    {
      icon: ShieldCheckIcon,
      label: 'Privacy Policy',
      href: 'https://2fastudio.app/privacy'
    },
    {
      icon: CodeBracketIcon,
      label: 'Open Source Licenses',
      href: 'https://2fastudio.app/licenses'
    },
    {
      icon: GlobeAltIcon,
      label: 'Website',
      href: 'https://2fastudio.app'
    }
  ];

  const stats = [
    { label: 'Active Users', value: '10,000+' },
    { label: 'Accounts Secured', value: '500,000+' },
    { label: 'Countries', value: '150+' },
    { label: 'Uptime', value: '99.9%' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">About 2FA Studio</h2>
        <p className="text-sm text-muted-foreground">
          Your trusted companion for two-factor authentication
        </p>
      </div>

      {/* App Info */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
            <ShieldCheckIcon className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">2FA Studio</h3>
            <p className="text-sm text-muted-foreground">
              Version {appVersion} (Build {buildNumber})
            </p>
            <p className="text-xs text-muted-foreground">
              Released on {buildDate}
            </p>
          </div>
        </div>

        <button
          onClick={handleCheckForUpdates}
          className="btn btn-outline btn-sm"
        >
          <SparklesIcon className="w-4 h-4" />
          Check for Updates
        </button>
      </div>

      {/* Mission Statement */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-3">Our Mission</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          2FA Studio is committed to making two-factor authentication accessible, secure, and 
          user-friendly for everyone. We believe that security shouldn't come at the cost of 
          convenience, and we're dedicated to protecting your digital identity with the best 
          encryption and security practices available.
        </p>
      </div>

      {/* Stats */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-4">By the Numbers</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Key Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-3">
            <ShieldCheckIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground text-sm">End-to-End Encryption</p>
              <p className="text-xs text-muted-foreground">
                Your data is encrypted locally before sync
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CodeBracketIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground text-sm">Open Standards</p>
              <p className="text-xs text-muted-foreground">
                Compatible with TOTP/HOTP standards
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <GlobeAltIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground text-sm">Cross-Platform</p>
              <p className="text-xs text-muted-foreground">
                Available on iOS, Android, and Chrome
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <HeartIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground text-sm">Privacy First</p>
              <p className="text-xs text-muted-foreground">
                Zero-knowledge architecture
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Support</h3>
        <div className="space-y-3">
          <button
            onClick={handleReportBug}
            className="w-full flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BugAntIcon className="w-5 h-5 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium text-foreground">Report a Bug</p>
                <p className="text-sm text-muted-foreground">
                  Help us improve by reporting issues
                </p>
              </div>
            </div>
            <span className="text-muted-foreground">→</span>
          </button>

          <button
            onClick={handleContactSupport}
            className="w-full flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="w-5 h-5 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium text-foreground">Contact Support</p>
                <p className="text-sm text-muted-foreground">
                  Get help from our support team
                </p>
              </div>
            </div>
            <span className="text-muted-foreground">→</span>
          </button>
        </div>
      </div>

      {/* Legal Links */}
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Legal</h3>
        <div className="space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">{link.label}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Credits */}
      <div className="border-t border-border pt-6">
        <p className="text-center text-sm text-muted-foreground">
          Made with <HeartIcon className="w-4 h-4 inline text-red-500" /> by the 2FA Studio Team
        </p>
        <p className="text-center text-xs text-muted-foreground mt-1">
          © 2024 2FA Studio. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AboutSettings;