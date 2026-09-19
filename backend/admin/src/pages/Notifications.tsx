import React, { useState, useEffect } from 'react';
import { Send, Bell, Smartphone, AlertCircle, CheckCircle2, Loader2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';
import { DeviceRegistration, Prompt, NotificationErrorDetail } from '../types';

export default function Notifications() {
  const [devices, setDevices] = useState<DeviceRegistration[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [destinationType, setDestinationType] = useState<'none' | 'home' | 'explore' | 'saved' | 'prompt_detail'>('none');
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [audience, setAudience] = useState<'all' | 'installation'>('all');
  const [selectedInstallationId, setSelectedInstallationId] = useState('');

  // UI State
  const [validationError, setValidationError] = useState('');
  const [successResult, setSuccessResult] = useState<{
    sent: number;
    failed: number;
    errors?: NotificationErrorDetail[];
  } | null>(null);
  const [apiError, setApiError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devList, promptList] = await Promise.all([
        api.getDevices().catch(() => []),
        api.getPrompts().catch(() => [])
      ]);
      setDevices(devList);
      setPrompts(promptList);
      if (devList.length > 0) {
        setSelectedInstallationId(devList[0].installation_id);
      }
      if (promptList.length > 0) {
        setSelectedPromptId(promptList[0].id);
      }
    } catch (e) {
      console.error("Error loading notification page data:", e);
    } finally {
      setLoading(false);
    }
  };

  const computeDeepLink = (): string | undefined => {
    if (destinationType === 'none') return undefined;
    if (destinationType === 'home') return 'home';
    if (destinationType === 'explore') return 'explore';
    if (destinationType === 'saved') return 'saved';
    if (destinationType === 'prompt_detail' && selectedPromptId) {
      return `prompt_detail:${selectedPromptId}`;
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    setValidationError('');
    setApiError('');

    if (!title.trim()) {
      setValidationError('Notification title is required.');
      return false;
    }

    if (!body.trim()) {
      setValidationError('Notification message is required.');
      return false;
    }

    if (imageUrl.trim()) {
      const clean = imageUrl.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        setValidationError('Image URL must start with http:// or https://');
        return false;
      }
    }

    if (audience === 'installation' && !selectedInstallationId) {
      setValidationError('Please select a registered target device.');
      return false;
    }

    if (destinationType === 'prompt_detail' && !selectedPromptId) {
      setValidationError('Please select a target prompt for the Prompt Detail destination.');
      return false;
    }

    return true;
  };

  const handleSendClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (audience === 'all') {
      setShowConfirmModal(true);
    } else {
      executeSend();
    }
  };

  const executeSend = async () => {
    setShowConfirmModal(false);
    setSending(true);
    setSuccessResult(null);
    setApiError('');

    const deepLink = computeDeepLink();

    try {
      const res = await api.sendNotification({
        title: title.trim(),
        body: body.trim(),
        imageUrl: imageUrl.trim() || undefined,
        deepLink,
        audience,
        installation_id: audience === 'installation' ? selectedInstallationId : undefined
      });

      if (res.success) {
        setSuccessResult({
          sent: res.sent,
          failed: res.failed,
          errors: res.errors
        });
        // Clear title & body on success while keeping audience selection
        setTitle('');
        setBody('');
        setImageUrl('');
      } else {
        setApiError(res.error || 'Failed to send push notification');
      }
    } catch (err: any) {
      setApiError(err.message || 'Server error while sending push notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bell className="text-blue-500" size={24} />
            Push Notifications
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Broadcast or send targeted FCM notifications directly to registered Android app installations.
          </p>
        </div>

        {/* Device Stats Badge */}
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 self-start sm:self-auto">
          <Smartphone size={18} className="text-blue-400" />
          <span>Registered Devices:</span>
          <span className="text-white font-bold">{loading ? '...' : devices.length}</span>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
        <form onSubmit={handleSendClick} className="space-y-6">
          {/* Notification Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notification Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 🔥 New AI Prompts Added!"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Notification Body */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notification Message <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g., Discover fresh Cinematic & Fantasy prompt tokens crafted for Imagen 3 and Flash 2.0."
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            />
          </div>

          {/* Optional Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
              <ImageIcon size={16} className="text-gray-400" />
              Optional Image URL <span className="text-xs text-gray-500">(HTTP / HTTPS)</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/demo/image/upload/banner.jpg"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>

          {/* Destination / Deep Link */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-800/80">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1.5">
                <LinkIcon size={16} className="text-gray-400" />
                App Destination <span className="text-xs text-gray-500">(Deep Link)</span>
              </label>
              <select
                value={destinationType}
                onChange={(e) => setDestinationType(e.target.value as any)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              >
                <option value="none">Default (Launch App)</option>
                <option value="home">Home Screen</option>
                <option value="explore">Explore / Discover Screen</option>
                <option value="saved">Saved / Liked Screen</option>
                <option value="prompt_detail">Specific Prompt Detail</option>
              </select>
            </div>

            {destinationType === 'prompt_detail' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Target Prompt
                </label>
                <select
                  value={selectedPromptId}
                  onChange={(e) => setSelectedPromptId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                >
                  {prompts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.gender})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Audience Selection */}
          <div className="pt-2 border-t border-gray-800/80">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Target Audience
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-gray-950 border border-gray-800 rounded-lg cursor-pointer hover:border-gray-700 transition-all">
                <input
                  type="radio"
                  name="audience"
                  value="all"
                  checked={audience === 'all'}
                  onChange={() => setAudience('all')}
                  className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-700 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-semibold text-white block">All Registered Devices</span>
                  <span className="text-xs text-gray-400">
                    Broadcast push notification to all {devices.length} registered app installations.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-gray-950 border border-gray-800 rounded-lg cursor-pointer hover:border-gray-700 transition-all">
                <input
                  type="radio"
                  name="audience"
                  value="installation"
                  checked={audience === 'installation'}
                  onChange={() => setAudience('installation')}
                  className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-700 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-semibold text-white block">Selected Device / Test Device</span>
                  <span className="text-xs text-gray-400">
                    Target a single specific test device by its installation ID.
                  </span>
                </div>
              </label>
            </div>

            {/* Target Device Dropdown */}
            {audience === 'installation' && (
              <div className="mt-3 pl-2">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Select Registered Device
                </label>
                {devices.length === 0 ? (
                  <p className="text-xs text-amber-400">No registered devices found in database.</p>
                ) : (
                  <select
                    value={selectedInstallationId}
                    onChange={(e) => setSelectedInstallationId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {devices.map((d) => (
                      <option key={d.id} value={d.installation_id}>
                        {d.installation_id} (Active: {new Date(d.updated_at).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Instant Delivery Notice */}
          <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-3 text-xs text-blue-300 flex items-center justify-between">
            <span>⚡ Instant Push Delivery via Firebase Cloud Messaging</span>
            <span className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded font-mono">
              Scheduled Delivery Coming Soon
            </span>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div className="bg-red-950/50 border border-red-800/60 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={18} className="text-red-400 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* API Error Banner */}
          {apiError && (
            <div className="bg-red-950/50 border border-red-800/60 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={18} className="text-red-400 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Success / Delivery Result Banner */}
          {successResult && (
            <div className={`border rounded-lg p-4 text-sm space-y-2 ${
              successResult.sent > 0
                ? 'bg-green-950/50 border-green-800/60 text-green-300'
                : 'bg-amber-950/50 border-amber-800/60 text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className={successResult.sent > 0 ? 'text-green-400 shrink-0' : 'text-amber-400 shrink-0'} />
                <div>
                  <span className="font-semibold block">
                    {successResult.sent > 0 ? 'Notification sent successfully!' : 'Push Notification Dispatch Completed'}
                  </span>
                  <span className="text-xs">
                    {successResult.sent} delivered, {successResult.failed} failed.
                  </span>
                </div>
              </div>

              {/* Detailed FCM Error Reasons */}
              {successResult.errors && successResult.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-800/40 text-xs space-y-2">
                  <span className="font-semibold text-amber-200 block">Firebase Messaging Error Reasons:</span>
                  {successResult.errors.map((err, idx) => (
                    <div key={idx} className="bg-black/40 p-2.5 rounded-lg border border-amber-900/50 font-mono text-amber-200 space-y-1">
                      <div><strong className="text-amber-400 font-semibold">Error Code:</strong> {err.code}</div>
                      <div><strong className="text-amber-400 font-semibold">Details:</strong> {err.message}</div>
                      {err.count > 1 && (
                        <div className="text-amber-400/80 text-[11px] font-sans pt-0.5">Affected Devices: {err.count}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={sending || loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
            >
              {sending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Sending Push Notification...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Send Push Notification</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal for Broadcast */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertCircle className="text-amber-400" size={20} />
              Confirm Push Broadcast
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Are you sure you want to send this push notification to all{' '}
              <strong className="text-white font-semibold">{devices.length} registered devices</strong>?
            </p>
            <div className="bg-gray-950 p-3 rounded-lg text-xs space-y-1 text-gray-400 border border-gray-800">
              <p><strong className="text-gray-300">Title:</strong> {title}</p>
              <p className="line-clamp-2"><strong className="text-gray-300">Message:</strong> {body}</p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSend}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-2"
              >
                <Send size={16} />
                Confirm Send Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
