import { useState } from "react";
import { DollarSign, Download, CheckCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const MOCK_REVENUE_DATA = [
  { month: "Jan 2026", gross: 50000000, platform: 25000000, creatorPool: 25000000 },
  { month: "Feb 2026", gross: 65000000, platform: 32500000, creatorPool: 32500000 },
  { month: "Mar 2026", gross: 80000000, platform: 40000000, creatorPool: 40000000 },
  { month: "Apr 2026", gross: 95000000, platform: 47500000, creatorPool: 47500000 },
  { month: "May 2026", gross: 120000000, platform: 60000000, creatorPool: 60000000 },
  { month: "Jun 2026", gross: 150000000, platform: 75000000, creatorPool: 75000000 },
];

const MOCK_PAYOUTS = [
  { id: "1", creatorName: "Nguyen Van A", bank: "Vietcombank", account: "0123456789", amount: 15000000, status: "pending", learners: 1500 },
  { id: "2", creatorName: "Tran Thi B", bank: "Techcombank", account: "1903456789", amount: 20000000, status: "pending", learners: 2000 },
  { id: "3", creatorName: "Le Van C", bank: "MB Bank", account: "9876543210", amount: 5000000, status: "paid", learners: 500 },
  { id: "4", creatorName: "Pham Thi D", bank: "VPBank", account: "1234567890", amount: 35000000, status: "paid", learners: 3500 },
];

const COLORS = ["#5865F2", "#10B981", "#F59E0B", "#EF4444"];

export default function RevenuePage() {
  const [payouts, setPayouts] = useState(MOCK_PAYOUTS);

  const handleMarkPaid = (id: string) => {
    setPayouts(payouts.map(p => p.id === id ? { ...p, status: "paid" } : p));
  };

  const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="page-container fade-in">
      <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">
            <DollarSign className="title-icon" />
            Revenue & Payouts
          </h1>
          <p className="page-description">
            Track system revenue, Plus subscriptions, and manage creator payouts.
          </p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={18} />
          Export Payouts CSV
        </button>
      </header>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "1rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Total Revenue (Jun)</p>
          <h2 style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--text-main)" }}>{formatVND(150000000)}</h2>
        </div>
        <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "1rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Platform Profit (Jun)</p>
          <h2 style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--accent-primary)" }}>{formatVND(75000000)}</h2>
        </div>
        <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "1rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Creator Pool (Jun)</p>
          <h2 style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--accent-success)" }}>{formatVND(75000000)}</h2>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Main Revenue Chart */}
        <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "1rem", height: "400px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem", color: "var(--text-main)" }}>Revenue Split (Platform vs Creator)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MOCK_REVENUE_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" tickFormatter={(val) => \`\${val / 1000000}M\`} />
              <RechartsTooltip 
                formatter={(value: number) => formatVND(value)}
                contentStyle={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)", borderRadius: "8px" }}
              />
              <Legend />
              <Bar dataKey="platform" stackId="a" fill="var(--accent-primary)" name="Platform Profit" radius={[0, 0, 4, 4]} />
              <Bar dataKey="creatorPool" stackId="a" fill="#10B981" name="Creator Pool" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Growth Line Chart */}
        <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "1rem", height: "400px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem", color: "var(--text-main)" }}>Gross Growth</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MOCK_REVENUE_DATA} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-muted)" />
              <RechartsTooltip 
                formatter={(value: number) => formatVND(value)}
                contentStyle={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-color)", borderRadius: "8px" }}
              />
              <Line type="monotone" dataKey="gross" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} name="Gross Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "1rem" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem", color: "var(--text-main)" }}>Creator Payouts (Jun 2026)</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", textAlign: "left" }}>
                <th style={{ padding: "1rem 0" }}>Creator</th>
                <th style={{ padding: "1rem 0" }}>Learners</th>
                <th style={{ padding: "1rem 0" }}>Payout Amount</th>
                <th style={{ padding: "1rem 0" }}>Bank Details</th>
                <th style={{ padding: "1rem 0" }}>Status</th>
                <th style={{ padding: "1rem 0", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "1rem 0", fontWeight: "500", color: "var(--text-main)" }}>{p.creatorName}</td>
                  <td style={{ padding: "1rem 0", color: "var(--text-muted)" }}>{p.learners.toLocaleString()}</td>
                  <td style={{ padding: "1rem 0", fontWeight: "bold", color: "#10B981" }}>{formatVND(p.amount)}</td>
                  <td style={{ padding: "1rem 0" }}>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-main)" }}>{p.bank}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.account}</div>
                  </td>
                  <td style={{ padding: "1rem 0" }}>
                    {p.status === 'paid' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10B981', fontSize: '0.875rem', fontWeight: 500 }}>
                        <CheckCircle size={16} /> Paid
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#F59E0B', fontSize: '0.875rem', fontWeight: 500 }}>
                        <Clock size={16} /> Pending
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "1rem 0", textAlign: "right" }}>
                    {p.status === 'pending' && (
                      <button 
                        className="btn btn-secondary" 
                        style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
                        onClick={() => handleMarkPaid(p.id)}
                      >
                        Mark as Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
