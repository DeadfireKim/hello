'use client';

import { useState, useEffect } from 'react';

interface ScreenshotResult {
  url: string;
  format: string;
  width: number;
  height: number;
  size: number;
}

interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  targetUrl: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  screenshot?: ScreenshotResult;
  error?: {
    code: string;
    message: string;
  };
}

export default function Home() {
  const [targetUrl, setTargetUrl] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced options
  const [viewport, setViewport] = useState({ width: 1920, height: 1080 });
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState(80);
  const [fullPage, setFullPage] = useState(true);

  // Poll job status
  useEffect(() => {
    if (!jobId || jobStatus?.status === 'completed' || jobStatus?.status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/screenshot/${jobId}`);
        const data = await response.json();

        if (response.ok) {
          setJobStatus(data);

          if (data.status === 'completed' || data.status === 'failed') {
            setLoading(false);
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [jobId, jobStatus?.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setJobId(null);
    setJobStatus(null);
    setLoading(true);

    try {
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUrl,
          callbackUrl: `${window.location.origin}/api/callback-dummy`,
          options: {
            viewport,
            fullPage,
            format,
            quality,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create screenshot job');
      }

      setJobId(data.jobId);
      setJobStatus({
        jobId: data.jobId,
        status: data.status,
        targetUrl,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!jobStatus) return 'text-gray-600';
    switch (jobStatus.status) {
      case 'pending':
        return 'text-yellow-600';
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusEmoji = () => {
    if (!jobStatus) return '⏳';
    switch (jobStatus.status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '⏳';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            📸 Screenshot API Tester
          </h1>
          <p className="text-lg text-gray-600">
            Enter a URL and get a full-page screenshot
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* URL Input */}
            <div>
              <label htmlFor="url" className="block text-sm font-semibold text-gray-700 mb-2">
                Target URL
              </label>
              <input
                type="url"
                id="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Advanced Options Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2"
              >
                {showAdvanced ? '▼' : '▶'} Advanced Options
              </button>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Viewport Width
                    </label>
                    <input
                      type="number"
                      value={viewport.width}
                      onChange={(e) =>
                        setViewport({ ...viewport, width: parseInt(e.target.value) })
                      }
                      min="320"
                      max="3840"
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Viewport Height
                    </label>
                    <input
                      type="number"
                      value={viewport.height}
                      onChange={(e) =>
                        setViewport({ ...viewport, height: parseInt(e.target.value) })
                      }
                      min="240"
                      max="2160"
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Format
                    </label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as 'png' | 'jpeg' | 'webp')}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="png">PNG</option>
                      <option value="jpeg">JPEG</option>
                      <option value="webp">WebP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quality (1-100)
                    </label>
                    <input
                      type="number"
                      value={quality}
                      onChange={(e) => setQuality(parseInt(e.target.value))}
                      min="1"
                      max="100"
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fullPage}
                      onChange={(e) => setFullPage(e.target.checked)}
                      disabled={loading}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Capture full page (including content below the fold)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
            >
              {loading ? '🔄 Processing...' : '📸 Capture Screenshot'}
            </button>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-2xl mr-3">❌</span>
              <div>
                <h3 className="text-red-800 font-semibold">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status Display */}
        {jobStatus && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Job Status</h2>
              <div className={`flex items-center gap-2 ${getStatusColor()} font-semibold text-lg`}>
                <span className="text-2xl">{getStatusEmoji()}</span>
                <span className="uppercase">{jobStatus.status}</span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Job ID:</span>
                <span className="font-mono text-gray-900">{jobStatus.jobId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Target URL:</span>
                <span className="text-gray-900 truncate max-w-md">{jobStatus.targetUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="text-gray-900">
                  {new Date(jobStatus.createdAt).toLocaleString()}
                </span>
              </div>
              {jobStatus.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="text-gray-900">
                    {new Date(jobStatus.completedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Loading Animation */}
            {(jobStatus.status === 'pending' || jobStatus.status === 'processing') && (
              <div className="mt-6">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/4"></div>
                </div>
                <p className="text-center text-sm text-gray-600 mt-2">
                  Please wait while we capture the screenshot...
                </p>
              </div>
            )}

            {/* Error Result */}
            {jobStatus.status === 'failed' && jobStatus.error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-semibold mb-2">
                  Error: {jobStatus.error.code}
                </h3>
                <p className="text-red-700">{jobStatus.error.message}</p>
              </div>
            )}
          </div>
        )}

        {/* Screenshot Result */}
        {jobStatus?.status === 'completed' && jobStatus.screenshot && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Screenshot Result</h2>
              <a
                href={jobStatus.screenshot.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                ⬇️ Download
              </a>
            </div>

            <div className="mb-4 text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="font-semibold uppercase">{jobStatus.screenshot.format}</span>
              </div>
              <div className="flex justify-between">
                <span>Dimensions:</span>
                <span className="font-semibold">
                  {jobStatus.screenshot.width} × {jobStatus.screenshot.height}
                </span>
              </div>
              <div className="flex justify-between">
                <span>File Size:</span>
                <span className="font-semibold">
                  {(jobStatus.screenshot.size / 1024).toFixed(2)} KB
                </span>
              </div>
            </div>

            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
              <img
                src={jobStatus.screenshot.url}
                alt="Screenshot"
                className="w-full h-auto"
                style={{ maxHeight: '600px', objectFit: 'contain' }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-600">
          <p>Built with Next.js, Puppeteer, and Sharp</p>
          <p className="mt-1">Made with Claude Code 🤖</p>
        </footer>
      </div>
    </div>
  );
}
