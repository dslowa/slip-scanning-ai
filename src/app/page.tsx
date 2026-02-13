export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted mt-1">Overview of slip scanning activity</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending Review", value: "—", color: "text-warning" },
          { label: "Auto Approved", value: "—", color: "text-success" },
          { label: "Auto Rejected", value: "—", color: "text-danger" },
          { label: "Total Processed", value: "—", color: "text-primary" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-5"
          >
            <p className="text-sm text-muted">{stat.label}</p>
            <p className={`text-3xl font-bold mt-2 ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent activity placeholder */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Recent Activity
        </h2>
        <p className="text-muted text-sm">
          Connect your Supabase project to see live data. Update the environment
          variables in <code className="text-primary">.env.local</code> with your
          Supabase URL and anon key.
        </p>
      </div>
    </div>
  );
}
