'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4 px-4 bg-slate-50 dark:bg-slate-900">
      <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
        データの読み込み中にエラーが発生しました
      </p>
      {error.digest && (
        <p className="text-xs text-slate-400 font-mono">{error.digest}</p>
      )}
      <button
        onClick={reset}
        className="text-sm font-semibold text-ku-blue dark:text-blue-400 underline underline-offset-2"
      >
        再試行
      </button>
    </div>
  );
}
