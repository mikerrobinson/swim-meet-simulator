import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useMeet } from "~/context/meet-context";
import { useEffect } from "react";

export default function MeetLayout() {
  const { meet, setMeet } = useMeet();
  const navigate = useNavigate();

  // Redirect to home if no meet is loaded
  useEffect(() => {
    if (!meet) {
      navigate("/");
    }
  }, [meet, navigate]);

  if (!meet) {
    return null;
  }

  const navItems = [
    { to: "/events", label: "Events", count: meet.events.size },
    { to: "/teams", label: "Teams", count: meet.teams.size },
    { to: "/swimmers", label: "Swimmers", count: meet.swimmers.size },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-md">
                {meet.name}
              </h1>
            </div>

            <button
              onClick={() => setMeet(null)}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Load New PDF
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex gap-1 -mb-px">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
                  }`
                }
              >
                {item.label}
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {item.count}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
