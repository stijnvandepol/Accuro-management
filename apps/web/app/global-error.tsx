'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="bg-gray-50">
        <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6">
          <div className="w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900">Application error</h1>
            <p className="mt-2 text-sm text-gray-600">
              Something went wrong. If this keeps happening, use the request ID from the API response or server logs.
            </p>
            <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500">
              {error.digest ?? 'no-digest'}
            </p>
            <button onClick={() => reset()} className="mt-5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
