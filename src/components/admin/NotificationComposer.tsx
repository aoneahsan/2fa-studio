import React, { useState } from 'react';
import { Card } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { AdminNotificationsService } from '@services/admin-notifications.service';
import { 
  BellIcon, 
  UserGroupIcon, 
  TagIcon,
  PaperAirplaneIcon 
} from '@heroicons/react/24/outline';

interface NotificationComposerProps {
  onClose?: () => void;
}

export const NotificationComposer: React.FC<NotificationComposerProps> = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'segment' | 'user'>('all');
  const [targetValue, setTargetValue] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [sendEmail, setSendEmail] = useState(false);
  const [sendPush, setSendPush] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  const handleSend = async () => {
    setIsLoading(true);
    try {
      await AdminNotificationsService.sendNotification({
        title,
        message,
        targetType,
        targetValue,
        priority,
        channels: {
          push: sendPush,
          email: sendEmail
        }
      });
      
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to send notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTargetDescription = () => {
    switch (targetType) {
      case 'all':
        return 'This notification will be sent to all users';
      case 'segment':
        return 'Target specific user segments (e.g., "premium", "trial")';
      case 'user':
        return 'Send to specific user ID or email';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Compose Notification</h2>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message..."
              className="w-full mt-1 px-3 py-2 border rounded-lg resize-none"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/500 characters
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Target Audience</label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  value="all"
                  checked={targetType === 'all'}
                  onChange={(e) => setTargetType(e.target.value as any)}
                />
                <UserGroupIcon className="w-5 h-5" />
                <span>All Users</span>
              </label>
              
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  value="segment"
                  checked={targetType === 'segment'}
                  onChange={(e) => setTargetType(e.target.value as any)}
                />
                <TagIcon className="w-5 h-5" />
                <span>User Segment</span>
              </label>
              
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  value="user"
                  checked={targetType === 'user'}
                  onChange={(e) => setTargetType(e.target.value as any)}
                />
                <BellIcon className="w-5 h-5" />
                <span>Specific User</span>
              </label>
            </div>
            
            {targetType !== 'all' && (
              <Input
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder={targetType === 'segment' ? 'e.g., premium' : 'User ID or email'}
                className="mt-2"
              />
            )}
            
            <p className="text-xs text-muted-foreground mt-1">
              {getTargetDescription()}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full mt-1 px-3 py-2 border rounded-lg"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High (Sound + Vibration)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Delivery Channels</label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sendPush}
                  onChange={(e) => setSendPush(e.target.checked)}
                />
                <span>Push Notification</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                <span>Email</span>
              </label>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <Card className="p-4">
            <h3 className="font-medium mb-3">Preview</h3>
            
            {/* Mobile Preview */}
            <div className="mx-auto" style={{ maxWidth: '320px' }}>
              <div className="bg-gray-900 rounded-t-3xl px-4 py-2">
                <div className="flex justify-between items-center text-white text-xs">
                  <span>9:41 AM</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-3 bg-white rounded-sm"></div>
                    <div className="w-4 h-3 bg-white rounded-sm"></div>
                    <div className="w-4 h-3 bg-white rounded-sm"></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border-x border-b rounded-b-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <BellIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {title || 'Notification Title'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {message || 'Your notification message will appear here...'}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">now</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => setPreview(!preview)}>
          Test Send
        </Button>
        <Button 
          onClick={handleSend} 
          disabled={!title || !message || isLoading}
        >
          <PaperAirplaneIcon className="w-4 h-4 mr-2" />
          {isLoading ? 'Sending...' : 'Send Notification'}
        </Button>
      </div>
    </div>
  );
};