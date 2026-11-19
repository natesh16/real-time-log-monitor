import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api, BASE, errorText } from "./api";

const MAX_BUFFER = 200;
export function useLogs(filters) {
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pending = useRef([]);
  const pausedRef = useRef(false);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  pausedRef.current = paused;

  const loadLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (filters.level !== "ALL") params.level = filters.level;
      if (filters.service !== "ALL") params.service = filters.service;
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.requestId.trim()) params.requestId = filters.requestId.trim();
      const response = await api.get("/api/logs", { params });
      setLogs(response.data.items || []);
      setPagination(response.data.pagination || { page, limit: 50, total: 0, totalPages: 0 });
      setError("");
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }, [filters]);

  const loadMetrics = useCallback(async () => {
    try {
      const { data } = await api.get("/api/logs/metrics", { params: { windowMinutes: 60 } });
      setMetrics(data.data || null);
    } catch (e) { setError(x => x || errorText(e)); }
  }, []);

  const loadHealth = useCallback(async () => {
    try { const { data } = await api.get("/api/health"); setHealth(data); }
    catch (e) { setHealth({ status: "unavailable", database: "unknown" }); }
  }, []);

  const refresh = useCallback(() => { loadLogs(pagination.page); loadMetrics(); loadHealth(); }, [loadLogs, loadMetrics, loadHealth, pagination.page]);
  useEffect(() => { loadLogs(1); }, [loadLogs]);
  useEffect(() => {
    loadMetrics(); loadHealth();
    const timer = setInterval(() => { loadMetrics(); loadHealth(); }, 10000);
    return () => clearInterval(timer);
  }, [loadMetrics, loadHealth]);

  useEffect(() => {
    const socket = io(BASE || window.location.origin, { transports: ["websocket", "polling"], reconnection: true });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("new_log", log => {
      if (pausedRef.current) {
        pending.current = [log, ...pending.current].slice(0, MAX_BUFFER);
        return;
      }
      const f = filtersRef.current;
      const matches = (f.level === "ALL" || log.level === f.level)
        && (f.service === "ALL" || log.service === f.service)
        && (!f.requestId || (log.requestId || "").includes(f.requestId))
        && (!f.search || `${log.message} ${log.service} ${log.requestId || ""} ${log.traceId || ""}`.toLowerCase().includes(f.search.toLowerCase()));
      if (matches) setLogs(old => [log, ...old.filter(x => x._id !== log._id)].slice(0, MAX_BUFFER));
      setMetrics(old => old); // KPI aggregation is refreshed from persisted data on its polling interval.
    });
    return () => socket.disconnect();
  }, []);

  const togglePause = () => setPaused(current => {
    if (current && pending.current.length) {
      const queued = pending.current; pending.current = [];
      const f = filtersRef.current;
      const filtered = queued.filter(log =>
        (f.level === "ALL" || log.level === f.level) &&
        (f.service === "ALL" || log.service === f.service) &&
        (!f.search || log.message.toLowerCase().includes(f.search.toLowerCase()))
      );
      setLogs(existing => [...filtered, ...existing].slice(0, MAX_BUFFER));
    }
    return !current;
  });
  return { logs, metrics, health, pagination, connected, paused, loading, error, refresh, togglePause, loadLogs };
}
