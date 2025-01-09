import { metadata } from "./layout";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-2xl font-bold text-white">{metadata.title}</h1>
      </header>
      <main className="flex-grow p-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Welcome to Your DigitalOcean App</h2>
          <p className="mb-4">
            This is a sample application to demonstrate the DigitalOcean design style.
          </p>
          <ol className="list-decimal list-inside mb-4">
            <li className="mb-2">
              Start by editing{" "}
              <code className="bg-gray-200 px-1 py-0.5 rounded">src/app/page.js</code>.
            </li>
            <li>Save your changes and see them reflected instantly.</li>
          </ol>
          <div className="flex gap-4">
            <a
              className="bg-blue-600 text-white rounded-full px-4 py-2 hover:bg-blue-700 transition"
              href="https://www.digitalocean.com/products/app-platform/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Deploy Now
            </a>
            <a
              className="border border-gray-300 rounded-full px-4 py-2 hover:bg-gray-100 transition"
              href="https://www.digitalocean.com/docs/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the Docs
            </a>
          </div>
        </div>
      </main>
      <footer className="bg-gray-200 text-gray-400 p-4 text-center">
        <p>
          &copy; {new Date().getFullYear()} DigitalOcean. All rights reserved.
        </p>
      </footer>
    </div>
  );
}