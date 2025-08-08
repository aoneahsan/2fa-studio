import React from 'react';
import { 
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { CircularProgress } from './ProgressIndicators';
import { Tooltip } from './Tooltip';

interface SecurityScoreProps {
  score: number; // 0-100
  factors?: SecurityFactor[];
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface SecurityFactor {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  weight: number;
}

export const SecurityScore: React.FC<SecurityScoreProps> = ({
  score,
  factors = [],
  showDetails = true,
  size = 'md',
  className = ''
}) => {
  const getScoreColor = () => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = () => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Critical';
  };

  const getScoreIcon = () => {
    if (score >= 80) return ShieldCheckIcon;
    if (score >= 60) return ShieldExclamationIcon;
    return ExclamationTriangleIcon;
  };

  const Icon = getScoreIcon();

  const sizes = {
    sm: { container: 'w-20 h-20', icon: 'w-8 h-8', text: 'text-xs' },
    md: { container: 'w-32 h-32', icon: 'w-12 h-12', text: 'text-sm' },
    lg: { container: 'w-40 h-40', icon: 'w-16 h-16', text: 'text-base' }
  };

  const sizeConfig = sizes[size];

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Score Display */}
      <div className="relative">
        <CircularProgress
          value={score}
          size={size}
          className={getScoreColor()}
          showValue={false}
        />
        <div className={`absolute inset-0 flex flex-col items-center justify-center ${sizeConfig.container}`}>
          <Icon className={`${sizeConfig.icon} ${getScoreColor()}`} />
          <span className={`font-bold ${sizeConfig.text} ${getScoreColor()} mt-1`}>
            {score}
          </span>
        </div>
      </div>

      {/* Score Label */}
      <div className="text-center">
        <p className={`font-medium ${getScoreColor()}`}>{getScoreLabel()}</p>
        <p className="text-xs text-muted-foreground">Security Score</p>
      </div>

      {/* Factors List */}
      {showDetails && factors.length > 0 && (
        <div className="w-full space-y-2">
          {factors.map((factor) => (
            <SecurityFactor key={factor.id} factor={factor} />
          ))}
        </div>
      )}
    </div>
  );
};

// Individual security factor component
const SecurityFactor: React.FC<{ factor: SecurityFactor }> = ({ factor }) => {
  const getIcon = () => {
    switch (factor.status) {
      case 'pass':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'fail':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = () => {
    switch (factor.status) {
      case 'pass':
        return 'bg-green-50 border-green-200';
      case 'fail':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${getStatusColor()}`}>
      {getIcon()}
      <div className="flex-1">
        <p className="text-sm font-medium">{factor.name}</p>
        <p className="text-xs text-muted-foreground">{factor.description}</p>
      </div>
      <Tooltip content={`Weight: ${factor.weight}%`}>
        <InformationCircleIcon className="w-4 h-4 text-muted-foreground" />
      </Tooltip>
    </div>
  );
};

// Mini security score for inline display
export const MiniSecurityScore: React.FC<{
  score: number;
  className?: string;
}> = ({ score, className = '' }) => {
  const getColor = () => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getColor()} ${className}`}>
      <ShieldCheckIcon className="w-3 h-3" />
      {score}
    </span>
  );
};

// Security recommendations component
interface SecurityRecommendation {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface SecurityRecommendationsProps {
  recommendations: SecurityRecommendation[];
  className?: string;
}

export const SecurityRecommendations: React.FC<SecurityRecommendationsProps> = ({
  recommendations,
  className = ''
}) => {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (recommendations.length === 0) {
    return (
      <div className={`text-center p-6 bg-green-50 rounded-lg ${className}`}>
        <ShieldCheckIcon className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <p className="text-green-800 font-medium">Great job!</p>
        <p className="text-green-700 text-sm">No security improvements needed.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="font-medium text-sm text-muted-foreground mb-3">
        Security Recommendations ({recommendations.length})
      </h3>
      {recommendations.map((rec) => (
        <div key={rec.id} className="bg-white border rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">{rec.title}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getImpactColor(rec.impact)}`}>
                  {rec.impact} impact
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{rec.description}</p>
            </div>
            {rec.action && (
              <button
                onClick={rec.action.onClick}
                className="text-sm text-primary hover:underline"
              >
                {rec.action.label}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Account security status
export const AccountSecurityStatus: React.FC<{
  hasMFA: boolean;
  hasBackupCodes: boolean;
  lastBackup?: Date;
  className?: string;
}> = ({ hasMFA, hasBackupCodes, lastBackup, className = '' }) => {
  const factors: SecurityFactor[] = [
    {
      id: 'mfa',
      name: 'Two-Factor Authentication',
      description: hasMFA ? 'Enabled' : 'Not enabled',
      status: hasMFA ? 'pass' : 'fail',
      weight: 40
    },
    {
      id: 'backup-codes',
      name: 'Backup Codes',
      description: hasBackupCodes ? 'Generated' : 'Not generated',
      status: hasBackupCodes ? 'pass' : 'warning',
      weight: 30
    },
    {
      id: 'recent-backup',
      name: 'Recent Backup',
      description: lastBackup 
        ? `Last backup: ${new Date(lastBackup).toLocaleDateString()}`
        : 'No backups found',
      status: lastBackup && (Date.now() - lastBackup.getTime()) < 30 * 24 * 60 * 60 * 1000 
        ? 'pass' 
        : 'warning',
      weight: 30
    }
  ];

  const score = factors.reduce((acc, factor) => {
    return acc + (factor.status === 'pass' ? factor.weight : 0);
  }, 0);

  return (
    <SecurityScore
      score={score}
      factors={factors}
      size="sm"
      className={className}
    />
  );
};