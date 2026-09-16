/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl bg-[#1E1E1E] p-8 rounded-2xl border border-gray-800 shadow-xl">
        <h1 className="text-3xl font-bold mb-4 text-[#6BB8FF]">Android Project Generated</h1>
        <p className="text-gray-300 mb-6">
          The AI Image Prompt Library Android foundation has been generated in the workspace.
        </p>
        <div className="bg-black/50 p-4 rounded-lg text-left inline-block w-full">
          <p className="text-sm text-gray-400 mb-2">To run this project:</p>
          <ol className="list-decimal list-inside text-sm text-gray-300 space-y-2">
            <li>Open the <strong>Files</strong> panel in the editor.</li>
            <li>Export the project to GitHub or download as a ZIP.</li>
            <li>Open the <code>/android</code> folder in <strong>Android Studio</strong>.</li>
            <li>Sync Gradle and run on your emulator or device.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
