export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📸 Screenshot API
          </h1>
          <p className="text-lg text-gray-600">
            Website Screenshot Service with Webhook Callback
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-3">
              🚀 Features
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li>✅ Async job processing</li>
              <li>✅ Webhook callback</li>
              <li>✅ Full page screenshots</li>
              <li>✅ Rate limiting</li>
              <li>✅ RESTful API</li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-green-900 mb-3">
              📡 API Endpoints
            </h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                <code className="bg-white px-2 py-1 rounded">
                  POST /api/screenshot
                </code>
              </li>
              <li>
                <code className="bg-white px-2 py-1 rounded">
                  GET /api/screenshot/:jobId
                </code>
              </li>
              <li>
                <code className="bg-white px-2 py-1 rounded">
                  GET /api/health
                </code>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            📖 Example Request
          </h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`POST /api/screenshot
Content-Type: application/json

{
  "targetUrl": "https://example.com",
  "callbackUrl": "https://your-service.com/webhook"
}`}
          </pre>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            📝 Response
          </h2>
          <pre className="bg-gray-900 text-blue-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "estimatedTime": "5-10 seconds",
  "statusUrl": "/api/screenshot/550e8400..."
}`}
          </pre>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/api/health"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Check API Health
          </a>
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>Built with Next.js, Bull Queue, and Puppeteer</p>
          <p className="mt-1">Made with Claude Code 🤖</p>
        </footer>
      </div>
    </div>
  );
}
