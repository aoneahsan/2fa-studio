import React, { useState } from 'react';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { BackupService } from '@services/backup.service';
import { EncryptionService } from '@services/encryption.service';
import { useDispatch } from 'react-redux';
import { addToast } from '@store/slices/uiSlice';
import { CloudArrowDownIcon, KeyIcon, CheckCircleIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface BackupRestoreWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

type WizardStep = 'select' | 'authenticate' | 'decrypt' | 'restore' | 'complete';

export const BackupRestoreWizard: React.FC<BackupRestoreWizardProps> = ({ onClose, onComplete }) => {
  const dispatch = useDispatch();
  const [currentStep, setCurrentStep] = useState<WizardStep>('select');
  const [selectedBackup, setSelectedBackup] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [backupList, setBackupList] = useState<any[]>([]);
  const [restoredCount, setRestoredCount] = useState(0);

  const steps: { id: WizardStep; title: string; description: string }[] = [
    { id: 'select', title: 'Select Backup', description: 'Choose a backup to restore from' },
    { id: 'authenticate', title: 'Authenticate', description: 'Sign in to your cloud storage' },
    { id: 'decrypt', title: 'Enter Password', description: 'Enter your backup password' },
    { id: 'restore', title: 'Restore', description: 'Restoring your accounts' },
    { id: 'complete', title: 'Complete', description: 'Restore completed successfully' }
  ];

  const handleSelectBackupSource = async (source: 'google' | 'local') => {
    setIsLoading(true);
    try {
      if (source === 'google') {
        // Mock: In real app, this would authenticate and fetch backups
        setBackupList([
          { id: '1', date: new Date().toISOString(), size: '2.4 MB', accountCount: 15 },
          { id: '2', date: new Date(Date.now() - 86400000).toISOString(), size: '2.3 MB', accountCount: 14 }
        ]);
        setCurrentStep('authenticate');
      } else {
        // Handle local file selection
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            setSelectedBackup(file);
            setCurrentStep('decrypt');
          }
        };
        input.click();
      }
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to fetch backups'
      }) as any);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    setCurrentStep('restore');
    
    try {
      // Mock restore process
      await new Promise(resolve => setTimeout(resolve, 2000));
      setRestoredCount(selectedBackup?.accountCount || 15);
      setCurrentStep('complete');
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to restore backup'
      }) as any);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIndex = (step: WizardStep) => steps.findIndex(s => s.id === step);
  const currentStepIndex = getStepIndex(currentStep);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-6">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index < currentStepIndex ? <CheckCircleIcon className="w-5 h-5" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold">{steps[currentStepIndex].title}</h2>
            <p className="text-sm text-muted-foreground">{steps[currentStepIndex].description}</p>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[300px]">
          {currentStep === 'select' && (
            <div className="space-y-4">
              <button
                onClick={() => handleSelectBackupSource('google')}
                className="w-full p-4 border rounded-lg hover:border-primary transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <CloudArrowDownIcon className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="font-medium">Google Drive Backup</h3>
                    <p className="text-sm text-muted-foreground">Restore from your cloud backup</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleSelectBackupSource('local')}
                className="w-full p-4 border rounded-lg hover:border-primary transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <CloudArrowDownIcon className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="font-medium">Local File</h3>
                    <p className="text-sm text-muted-foreground">Restore from a backup file</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {currentStep === 'authenticate' && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">Select a backup to restore:</p>
              <div className="space-y-2">
                {backupList.map(backup => (
                  <button
                    key={backup.id}
                    onClick={() => {
                      setSelectedBackup(backup);
                      setCurrentStep('decrypt');
                    }}
                    className="w-full p-3 border rounded-lg hover:border-primary transition-colors text-left"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {new Date(backup.date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {backup.accountCount} accounts • {backup.size}
                        </p>
                      </div>
                      <ArrowRightIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'decrypt' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <KeyIcon className="w-12 h-12 text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">Enter your backup password to decrypt</p>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter backup password"
                className="w-full px-4 py-2 border rounded-lg"
                autoFocus
              />
            </div>
          )}

          {currentStep === 'restore' && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
              <p className="text-muted-foreground">Restoring your accounts...</p>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="flex flex-col items-center justify-center h-full">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Restore Complete!</h3>
              <p className="text-muted-foreground">
                Successfully restored {restoredCount} accounts
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={currentStep === 'select' ? onClose : () => {
              const prevIndex = currentStepIndex - 1;
              if (prevIndex >= 0) setCurrentStep(steps[prevIndex].id);
            }}
          >
            {currentStep === 'select' ? 'Cancel' : (
              <>
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back
              </>
            )}
          </Button>
          
          {currentStep === 'decrypt' && (
            <Button onClick={handleRestore} disabled={!password || isLoading}>
              Start Restore
            </Button>
          )}
          
          {currentStep === 'complete' && (
            <Button onClick={onComplete}>
              Done
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};