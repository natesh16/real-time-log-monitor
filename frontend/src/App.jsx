import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, CircleDot, Database, Pause, Play, RefreshCw, Search, X } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLogs } from "./useLogs";

const severity = { ERROR: "#fb7185", WARN: "#fbbf24", INFO: "#60a5fa", DEBUG: "#a78bfa" };
function Kpi({ label, value, detail, color }) {
  return <article className="metric"><div>{label}<i style={{ background: color }} /></div><strong>{value}</strong><small>{detail}</small></article>;
}
function LogDetails({ log, onClose }) {
  if (!log) return null;
  return <div className="shade" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="modal"><header><div><small>STRUCTURED EVENT</small><h2>Log details</h2></div><button onClick={onClose} aria-label="Close details"><X /></button></header>
      <div className="detail-grid"><span>Service</span><b>{log.service}</b><span>Severity</span><b className={`tag ${log.level?.toLowerCase()}`}>{log.level}</b><span>Request ID</span><code>{log.requestId || "—"}</code><span>Trace ID</span><code>{log.traceId || "—"}</code><span>Received</span><code>{log.receivedAt ? new Date(log.receivedAt).toLocaleString() : "—"}</code></div>
      <p className="detail-message">{log.message}</p>
      <pre className="json">{JSON.stringify({ environment: log.environment, host: log.host, source: log.source, latencyMs: log.latencyMs, metadata: log.metadata, error: log.error }, null, 2)}</pre>
    </section>
  </div>;
}
export default function App() {
  const [filters, setFilters] = useState({ level: "ALL", service: "ALL", search: "", requestId: "" });
  const [selected, setSelected] = useState(null);
  const { logs, metrics, health, pagination, connected, paused, loading, error, refresh, togglePause, loadLogs } = useLogs(filters);
  const services = useMemo(() => (metrics?.services || []).map(s => s.service), [metrics]);
  const timeline = (metrics?.timeline || []).map(x => ({
    time: new Date(Date.UTC(x.bucket.year, x.bucket.month - 1, x.bucket.day, x.bucket.hour, x.bucket.minute)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    events: x.count
  }));
  const levels = (metrics?.levels || []).map(x => ({ ...x, color: severity[x.level] || "#64748b" }));
  const statusGood = health?.status === "healthy" && connected;
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="logo"><Activity /></span><div><b>Pulse<span>Ops</span></b><small>LOG OBSERVABILITY</small></div></div>
      <div className="top-actions"><span className={connected ? "online" : "offline"}><CircleDot size={12}/>{connected ? "SOCKET CONNECTED" : "SOCKET DISCONNECTED"}</span><span className={health?.database === "connected" ? "online" : "offline"}><Database size={13}/>{health?.database === "connected" ? "DATABASE CONNECTED" : "DATABASE UNAVAILABLE"}</span><button className="secondary" onClick={refresh}><RefreshCw size={14}/> Refresh</button></div>
    </header>
    <main className="content">
      <section className="page-heading"><div><small className="eyebrow">LIVE SYSTEM TELEMETRY</small><h1>Log monitoring</h1><p>Persisted application events and real-time service activity.</p></div>
        <div className={`health-pill ${statusGood ? "healthy" : "degraded"}`}><i />{statusGood ? "API and stream operational" : "Connection or API degraded"}</div>
      </section>
      {error && <div className="error"><AlertTriangle size={16}/>{error}</div>}
      <section className="metrics">
        <Kpi label="Events · 60 min" value={metrics ? metrics.totalLogs.toLocaleString() : "—"} detail="Persisted log records" color="#819cff"/>
        <Kpi label="Error rate" value={metrics ? `${metrics.errorRate.toFixed(2)}%` : "—"} detail={`${metrics?.errorLogs ?? 0} error events`} color="#fb7185"/>
        <Kpi label="Active services" value={metrics?.activeServices ?? "—"} detail="Observed in last 60 minutes" color="#b18bff"/>
        <Kpi label="Average latency" value={metrics?.averageLatencyMs == null ? "—" : `${metrics.averageLatencyMs} ms`} detail="Events with latency data" color="#f5c46c"/>
      </section>
      <section className="charts">
        <article className="panel"><div className="panel-head"><div><b>Ingestion volume</b><small>Five-minute buckets · Last 60 minutes</small></div><span className="chart-key"><i/>Events</span></div>
          <div className="area">{timeline.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={timeline}><defs><linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7894ff" stopOpacity={.35}/><stop offset="100%" stopColor="#7894ff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#253147" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="time" tick={{ fill: "#8290a8", fontSize: 10 }}/><YAxis allowDecimals={false} tick={{ fill: "#8290a8", fontSize: 10 }}/><Tooltip contentStyle={{ background: "#111b2b", border: "1px solid #34435c", borderRadius: 8 }}/><Area dataKey="events" stroke="#829bff" fill="url(#pulseFill)"/></AreaChart></ResponsiveContainer> : <div className="empty">No persisted events in this time window</div>}</div>
        </article>
        <article className="panel"><div className="panel-head"><div><b>Severity breakdown</b><small>Persisted records · Last 60 minutes</small></div></div>
          <div className="donut">{levels.length ? <><div className="pie"><ResponsiveContainer><PieChart><Pie data={levels} dataKey="count" nameKey="level" innerRadius="65%" outerRadius="88%" paddingAngle={3}>{levels.map(x => <Cell key={x.level} fill={x.color}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><b>{metrics?.totalLogs ?? 0}<small>Total</small></b></div><div className="legend">{levels.map(x => <div key={x.level}><span><i style={{ background: x.color }}/>{x.level}</span><b>{x.count}</b></div>)}</div></> : <div className="empty">No severity data available</div>}</div>
        </article>
      </section>
      <section className="panel explorer">
        <div className="explorer-head"><div><b>Log explorer</b><small>Search persisted logs. New matching events stream into this view.</small></div><span>{pagination.total.toLocaleString()} matching records</span></div>
        <div className="filters">
          <div className="search"><Search size={15}/><input aria-label="Search logs" placeholder="Search message, service, request or trace ID" value={filters.search} onChange={e => setFilters(x => ({ ...x, search: e.target.value }))}/></div>
          <input className="request-filter" aria-label="Request ID filter" placeholder="Request ID" value={filters.requestId} onChange={e => setFilters(x => ({ ...x, requestId: e.target.value }))}/>
          <select value={filters.level} onChange={e => setFilters(x => ({ ...x, level: e.target.value }))}><option value="ALL">All severities</option>{Object.keys(severity).map(x => <option key={x}>{x}</option>)}</select>
          <select value={filters.service} onChange={e => setFilters(x => ({ ...x, service: e.target.value }))}><option value="ALL">All services</option>{services.map(x => <option key={x}>{x}</option>)}</select>
          <button className="text-button" onClick={() => setFilters({ level: "ALL", service: "ALL", search: "", requestId: "" })}>Clear filters</button>
        </div>
        <div className="stream-toolbar"><div><b>Incoming events</b><small>{paused ? "Stream paused · incoming events are buffered in memory" : "Live stream · newest events first"}</small></div><div className="stream-actions"><span className={connected ? "online" : "offline"}>● {connected ? "Live" : "Offline"}</span><button className="secondary" onClick={togglePause}>{paused ? <Play size={13}/> : <Pause size={13}/>} {paused ? "Resume" : "Pause"}</button></div></div>
        <div className="table-wrap"><table><thead><tr><th>RECEIVED</th><th>LEVEL</th><th>SERVICE</th><th>MESSAGE</th><th>REQUEST ID</th><th>LATENCY</th><th></th></tr></thead>
          <tbody>{loading ? <tr><td colSpan="7" className="empty">Loading records…</td></tr> : logs.length === 0 ? <tr><td colSpan="7" className="empty">No matching records found in MongoDB.</td></tr> : logs.map((log, i) => <tr key={log._id || i}><td className="mono">{log.receivedAt ? new Date(log.receivedAt).toLocaleTimeString() : "—"}</td><td><span className={`tag ${log.level?.toLowerCase()}`}>{log.level}</span></td><td className="service">{log.service}</td><td className="message" title={log.message}>{log.message}</td><td className="mono request-cell">{log.requestId || "—"}</td><td className="mono">{log.latencyMs == null ? "—" : `${log.latencyMs} ms`}</td><td><button className="view" onClick={() => setSelected(log)} aria-label="View log details">Details</button></td></tr>)}</tbody>
        </table></div>
        <div className="table-foot"><span>Page {pagination.page} of {Math.max(1, pagination.totalPages)}</span><div><button className="secondary small" disabled={pagination.page <= 1 || loading} onClick={() => loadLogs(pagination.page - 1)}><ChevronLeft size={13}/> Previous</button><button className="secondary small" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => loadLogs(pagination.page + 1)}>Next <ChevronRight size={13}/></button></div></div>
      </section>
      <footer>PulseOps · Metrics and records are sourced from the backend database.</footer>
    </main>
    <LogDetails log={selected} onClose={() => setSelected(null)}/>
  </div>;
}
