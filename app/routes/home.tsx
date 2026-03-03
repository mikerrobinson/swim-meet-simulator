import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { useMeet } from "~/context/meet-context";
import { parsePsychSheet } from "~/lib/psych-sheet-parser";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Swim Meet Simulator" },
    { name: "description", content: "Upload and analyze swim meet psych sheets" },
  ];
}

export default function Home() {
  const { setMeet } = useMeet();
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please upload a PDF file");
        return;
      }

      setError(null);
      setIsProcessing(true);

      try {
        // Dynamic import to ensure pdf.js only loads on client
        const { extractPdfText } = await import("~/lib/pdf-extractor");
        const extracted = await extractPdfText(file);
        const meetName = file.name.replace(/\.pdf$/i, "");
        const meet = parsePsychSheet(extracted, meetName);
        setMeet(meet);
        navigate("/events");
      } catch (err) {
        console.error("Error processing PDF:", err);
        setError(
          err instanceof Error ? err.message : "Failed to process PDF"
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [setMeet, navigate]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Swim Meet Simulator
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Upload a psych sheet PDF to view entries, teams, and swimmers
          </p>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center
            transition-all duration-200 ease-in-out
            ${
              isDragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"
            }
            ${isProcessing ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />

          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              {isProcessing ? (
                <svg
                  className="animate-spin h-8 w-8 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-8 w-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              )}
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {isProcessing
                  ? "Processing..."
                  : "Drop your psych sheet PDF here"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                or click to browse
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            PDF parsing happens entirely in your browser.
            <br />
            No data is uploaded to any server.
          </p>
        </div>
      </div>
    </div>
  );
}
