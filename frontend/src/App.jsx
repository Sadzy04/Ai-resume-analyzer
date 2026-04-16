import jsPDF from "jspdf";
import { useEffect, useState } from "react";

const API = "http://localhost:5000";

function ProgressRing({ value }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <svg width="120" height="120">
      <circle cx="60" cy="60" r={radius} stroke="#e5e7eb" strokeWidth="10" fill="none" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        stroke="#2563eb"
        strokeWidth="10"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text x="60" y="66" textAnchor="middle" fontSize="20" fontWeight="700">
        {value}%
      </text>
    </svg>
  );
}

function Badge({ text, type }) {
  const bg = type === "match" ? "#d1fae5" : "#fee2e2";
  const color = type === "match" ? "#065f46" : "#991b1b";

  return (
    <span
      style={{
        background: bg,
        color,
        padding: "6px 12px",
        borderRadius: 20,
        margin: 4,
        fontSize: 13,
        display: "inline-block",
      }}
    >
      {text}
    </span>
  );
}

function Banner({ type, message, onClose }) {
  if (!message) return null;

  const isSuccess = type === "success";

  return (
    <div
      style={{
        marginBottom: 20,
        padding: "14px 16px",
        borderRadius: 10,
        background: isSuccess ? "#dcfce7" : "#fee2e2",
        color: isSuccess ? "#166534" : "#991b1b",
        border: `1px solid ${isSuccess ? "#86efac" : "#fca5a5"}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          border: "none",
          background: "transparent",
          fontWeight: 700,
          cursor: "pointer",
          color: "inherit",
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [file, setFile] = useState(null);
  const [jd, setJd] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [minScore, setMinScore] = useState("");
  const [sortBy, setSortBy] = useState("latest");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 5,
    totalPages: 1,
  });

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function showSuccess(message) {
    setSuccessMessage(message);
    setErrorMessage("");
  }

  function showError(message) {
    setErrorMessage(message);
    setSuccessMessage("");
  }

  function clearMessages() {
    setSuccessMessage("");
    setErrorMessage("");
  }

  function getAuthHeaders() {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async function fetchMe() {
    if (!token) return;

    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch user");

      setUser(data);
    } catch (error) {
      console.error(error);
      logout();
    }
  }

  async function fetchHistory(
    search = searchTerm,
    score = minScore,
    sort = sortBy,
    pageNumber = page
  ) {
    if (!token) return;

    try {
      const params = new URLSearchParams();

      if (search.trim()) params.append("search", search);
      if (score !== "") params.append("minScore", score);
      if (sort) params.append("sortBy", sort);
      params.append("page", pageNumber);
      params.append("limit", 5);

      const res = await fetch(`${API}/analyses?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch analyses");

      setHistory(data.analyses || []);
      setPagination(
        data.pagination || {
          total: 0,
          page: 1,
          limit: 5,
          totalPages: 1,
        }
      );
    } catch (error) {
      console.error("Failed to fetch history:", error);
      showError("Failed to load saved analyses.");
    }
  }

  useEffect(() => {
    if (token) {
      fetchMe();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchHistory();
    }
  }, [token, searchTerm, minScore, sortBy, page]);

  async function handleAuth() {
    clearMessages();

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";

      const payload =
        mode === "login"
          ? { email, password }
          : { name, email, password };

      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(data.user);

      setName("");
      setEmail("");
      setPassword("");

      showSuccess(
        mode === "login"
          ? "Login successful."
          : "Registration successful. You are now logged in."
      );
    } catch (error) {
      console.error(error);
      showError(error.message || "Authentication failed.");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setHistory([]);
    setResult(null);
    clearMessages();
  }

  async function analyze() {
    clearMessages();

    if (!file || !jd.trim()) {
      showError("Please upload a resume and enter a job description.");
      return;
    }

    setLoading(true);

    try {
      const form = new FormData();
      form.append("resume", file);
      form.append("jobDescription", jd);

      const res = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setResult({
        ...data,
        fileName: file.name,
        jobDescription: jd,
        createdAt: new Date().toISOString(),
      });

      setPage(1);
      fetchHistory(searchTerm, minScore, sortBy, 1);
      showSuccess("Resume analyzed successfully.");
    } catch (error) {
      console.error("Analyze failed:", error);
      showError(error.message || "Something went wrong during analysis.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAnalysis(id) {
    clearMessages();

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this analysis?"
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API}/analyses/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete analysis");
      }

      if (expandedId === id) {
        setExpandedId(null);
      }

      fetchHistory();
      showSuccess("Analysis deleted successfully.");
    } catch (error) {
      console.error("Delete failed:", error);
      showError("Failed to delete analysis.");
    }
  }

  function toggleDetails(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function formatCategoryName(name) {
    return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 7) {
    const lines = doc.splitTextToSize(text || "", maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  }

  function generatePDFReport(data) {
    const doc = new jsPDF();
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("AI Resume Analyzer Report", 20, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const fileName = data.fileName || "Current Analysis";
    const score = data.score ?? "N/A";
    const createdAt = data.createdAt
      ? new Date(data.createdAt).toLocaleString()
      : new Date().toLocaleString();

    doc.text(`File Name: ${fileName}`, 20, y);
    y += 8;
    doc.text(`Score: ${score}%`, 20, y);
    y += 8;
    doc.text(`Date: ${createdAt}`, 20, y);
    y += 12;

    doc.setFont("helvetica", "bold");
    doc.text("Matched Keywords", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    y = addWrappedText(
      doc,
      data.matchedKeywords?.length
        ? data.matchedKeywords.join(", ")
        : "No matched keywords found.",
      20,
      y,
      170
    );
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Missing Keywords", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    y = addWrappedText(
      doc,
      data.missingKeywords?.length
        ? data.missingKeywords.join(", ")
        : "No missing keywords found.",
      20,
      y,
      170
    );
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Suggestions", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");

    if (data.suggestions?.length) {
      data.suggestions.forEach((s, index) => {
        y = addWrappedText(doc, `${index + 1}. ${s}`, 20, y, 170);
        y += 3;
      });
    }

    y += 8;

    if (data.categoryBreakdown && Object.keys(data.categoryBreakdown).length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Category-wise Match", 20, y);
      y += 8;
      doc.setFont("helvetica", "normal");

      Object.entries(data.categoryBreakdown).forEach(([category, details]) => {
        y = addWrappedText(
          doc,
          `${formatCategoryName(category)}: ${details.score}%`,
          20,
          y,
          170
        );
        y += 3;
      });
    }

    const safeName = (fileName || "analysis_report")
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-z0-9_\- ]/gi, "")
      .trim()
      .replace(/\s+/g, "_");

    doc.save(`${safeName || "analysis_report"}.pdf`);
  }

  function clearFilters() {
    setSearchTerm("");
    setMinScore("");
    setSortBy("latest");
    setPage(1);
  }

  if (!token) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#e0f2fe,#f8fafc)",
          fontFamily: "Segoe UI",
        }}
      >
        <div
          style={{
            width: 420,
            background: "white",
            padding: 30,
            borderRadius: 16,
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ marginBottom: 20 }}>
            {mode === "login" ? "Login" : "Create Account"}
          </h2>

          <Banner
            type="success"
            message={successMessage}
            onClose={() => setSuccessMessage("")}
          />
          <Banner
            type="error"
            message={errorMessage}
            onClose={() => setErrorMessage("")}
          />

          {mode === "register" && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 12,
                borderRadius: 8,
                border: "1px solid #ddd",
              }}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 16,
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          />

          <button
            onClick={handleAuth}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "none",
              background: "#111",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {mode === "login" ? "Login" : "Register"}
          </button>

          <p style={{ marginTop: 16, textAlign: "center" }}>
            {mode === "login" ? "Don’t have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                clearMessages();
                setMode(mode === "login" ? "register" : "login");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {mode === "login" ? "Register" : "Login"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 60px",
        fontFamily: "Segoe UI",
        background: "linear-gradient(135deg,#e0f2fe,#f8fafc)",
      }}
    >
      <Banner
        type="success"
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />
      <Banner
        type="error"
        message={errorMessage}
        onClose={() => setErrorMessage("")}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 40, textTransform: "uppercase", marginBottom: 10 }}>
            AI Resume Analyzer
          </h1>
          <p style={{ color: "#555" }}>
            Welcome, <strong>{user?.name || "User"}</strong>
          </p>
        </div>

        <button
          onClick={logout}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            background: "#dc2626",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 30,
          marginTop: 30,
        }}
      >
        <div
          style={{
            background: "white",
            padding: 30,
            borderRadius: 16,
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
          }}
        >
          <h3>Upload Resume</h3>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />

          <h3 style={{ marginTop: 20 }}>Job Description</h3>
          <textarea
            rows="10"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          />

          <button
            onClick={analyze}
            disabled={loading}
            style={{
              marginTop: 15,
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "none",
              background: loading ? "#94a3b8" : "#111",
              color: "white",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Analyzing..." : "Analyze Resume"}
          </button>
        </div>

        <div
          style={{
            background: "white",
            padding: 30,
            borderRadius: 16,
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
          }}
        >
          <h3>Results</h3>

          {!result && <p style={{ color: "#777" }}>Run analysis to see results.</p>}

          {result && (
            <>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <ProgressRing value={result.score} />
              </div>

              <h4 style={{ marginTop: 20 }}>Matched Keywords</h4>
              <div>
                {result.matchedKeywords?.map((k) => (
                  <Badge key={k} text={k} type="match" />
                ))}
              </div>

              <h4 style={{ marginTop: 20 }}>Missing Keywords</h4>
              <div>
                {result.missingKeywords?.map((k) => (
                  <Badge key={k} text={k} type="missing" />
                ))}
              </div>

              <h4 style={{ marginTop: 20 }}>Suggestions</h4>
              <ul>
                {result.suggestions?.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>

              <h4 style={{ marginTop: 20 }}>Category-wise Match</h4>
              <div style={{ display: "grid", gap: 10 }}>
                {result.categoryBreakdown &&
                  Object.entries(result.categoryBreakdown).map(([category, details]) => (
                    <div
                      key={category}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        background: "#f8fafc",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong>{formatCategoryName(category)}</strong>
                        <span>{details.score}%</span>
                      </div>
                    </div>
                  ))}
              </div>

              <button
                onClick={() => generatePDFReport(result)}
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#059669",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Download Current Report
              </button>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 40,
          background: "white",
          padding: 30,
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginBottom: 20 }}>Previous Analyses</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr auto",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <input
            type="text"
            placeholder="Search by resume file name..."
            value={searchTerm}
            onChange={(e) => {
              setPage(1);
              setSearchTerm(e.target.value);
            }}
            style={{
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          />

          <input
            type="number"
            placeholder="Minimum score"
            value={minScore}
            onChange={(e) => {
              setPage(1);
              setMinScore(e.target.value);
            }}
            min="0"
            max="100"
            style={{
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          />

          <select
            value={sortBy}
            onChange={(e) => {
              setPage(1);
              setSortBy(e.target.value);
            }}
            style={{
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "white",
            }}
          >
            <option value="latest">Sort: Latest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="highest">Sort: Highest Score</option>
            <option value="lowest">Sort: Lowest Score</option>
          </select>

          <button
            onClick={clearFilters}
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              border: "none",
              background: "#475569",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear Filters
          </button>
        </div>

        <p style={{ color: "#666", marginBottom: 18 }}>
          Showing page <strong>{pagination.page}</strong> of{" "}
          <strong>{pagination.totalPages || 1}</strong> — total{" "}
          <strong>{pagination.total}</strong> saved analyses
        </p>

        {history.length === 0 ? (
          <p style={{ color: "#777" }}>No analyses match your search/filter.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {history.map((item) => (
              <div
                key={item._id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  background: "#f9fafb",
                }}
              >
                <h4 style={{ margin: "0 0 8px 0" }}>{item.fileName}</h4>

                <p style={{ margin: "4px 0" }}>
                  <strong>Score:</strong> {item.score}%
                </p>

                <p style={{ margin: "4px 0" }}>
                  <strong>Date:</strong>{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </p>

                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() => toggleDetails(item._id)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "#2563eb",
                      color: "white",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {expandedId === item._id ? "Hide Details" : "View Details"}
                  </button>

                  <button
                    onClick={() => generatePDFReport(item)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "#059669",
                      color: "white",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Download PDF
                  </button>

                  <button
                    onClick={() => deleteAnalysis(item._id)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "#dc2626",
                      color: "white",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Delete Analysis
                  </button>
                </div>

                {expandedId === item._id && (
                  <div
                    style={{
                      marginTop: 18,
                      padding: 16,
                      borderRadius: 10,
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ marginTop: 10 }}>
                      <strong>Matched Keywords:</strong>
                      <div style={{ marginTop: 6 }}>
                        {item.matchedKeywords?.map((k) => (
                          <Badge key={k} text={k} type="match" />
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <strong>Missing Keywords:</strong>
                      <div style={{ marginTop: 6 }}>
                        {item.missingKeywords?.map((k) => (
                          <Badge key={k} text={k} type="missing" />
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <strong>Suggestions:</strong>
                      <ul style={{ marginTop: 8 }}>
                        {item.suggestions?.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <strong>Category-wise Match:</strong>
                      <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
                        {item.categoryBreakdown &&
                          Object.entries(item.categoryBreakdown).map(([category, details]) => (
                            <div
                              key={category}
                              style={{
                                padding: 12,
                                borderRadius: 10,
                                background: "#f8fafc",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <strong>{formatCategoryName(category)}</strong>
                                <span>{details.score}%</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "center",
            gap: 12,
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={pagination.page <= 1}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              background: pagination.page <= 1 ? "#cbd5e1" : "#111",
              color: "white",
              fontWeight: 600,
              cursor: pagination.page <= 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>

          <span style={{ fontWeight: 600 }}>
            Page {pagination.page} / {pagination.totalPages || 1}
          </span>

          <button
            onClick={() => setPage((prev) => (prev < pagination.totalPages ? prev + 1 : prev))}
            disabled={pagination.page >= pagination.totalPages}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              background:
                pagination.page >= pagination.totalPages ? "#cbd5e1" : "#111",
              color: "white",
              fontWeight: 600,
              cursor:
                pagination.page >= pagination.totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}