export function SiteFooter() {
  return (
    <footer className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-6 pt-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-4 border-t border-slate-200/70 pt-8 text-center sm:flex-row sm:gap-5 sm:text-left">
        <p className="text-sm text-slate-500">Data obtained via FOIA request. Some data is not available due to anonymization by the University.</p>
        <a
          href="https://github.com/MarvNC/DuckGrades"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600 shadow-sm shadow-slate-200/50 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-[#124734] hover:shadow-md"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.03-.01-1.87-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.09 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.74 0 0 .85-.28 2.78 1.05A9.43 9.43 0 0 1 12 6.84c.85 0 1.7.12 2.5.35 1.92-1.33 2.77-1.05 2.77-1.05.56 1.43.21 2.48.1 2.74.64.72 1.03 1.63 1.03 2.75 0 3.96-2.34 4.82-4.58 5.07.36.31.68.93.68 1.88 0 1.36-.01 2.45-.01 2.79 0 .27.18.59.69.49A10.28 10.28 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
          </svg>
          View on GitHub
        </a>
      </div>
    </footer>
  );
}
