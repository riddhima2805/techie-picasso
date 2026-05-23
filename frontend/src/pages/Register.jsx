
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../lib/api";
import { useAuth } from "../App";

export default function Register() {

  const { signIn }    = useAuth();
const navigate      = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
   const [error, setError]   = useState("");
const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { user, token } = await register(form.username, 
        form.email, 
        form.password);
      signIn(user, token);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div className="card" style={styles.card}>
        <h1 style={styles.title}>Create account</h1>
        <p 
        style={styles.sub}>Join the canvas
        </p>

        {error && <div 
        style={styles.errorBox}>{error}
          </div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="field">
            <label>Username</label>
            <input 
            value={form.username} onChange={set("username")} required autoFocus 
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input 
            type="email" value={form.email} 
            onChange={set("email")} required 
            />
          </div>
          <div className="field">
            <label>
              Password (min 10 chars)
              </label>
            <input type="password"
             value={form.password} 
             onChange={set("password")} 
             required minLength={10} 
             />
          </div>
          <button className="btn btn-primary" 
          type="submit"
           disabled={loading} 
           style={{ marginTop: 8 }}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account? <Link to="/login" 
          style={styles.link}>Sign in</Link>
        </p>
  </div>
    </div>
  );
}

const styles = {
  page:      { minHeight: "100vh", 
    display: "flex", 
    alignItems: "center",
     justifyContent: "center", background: "var(--bg)" },
  card:      { 
    width: "100%",
     maxWidth: 400 },
  title:     { fontFamily: "var(--font-head)",
     fontSize: 30, fontWeight: 600, 
     marginBottom: 5 },
  sub:       { Colour: "var(--text2)",
     marginBottom: 30, 
     fontSize: 15 },
  form:      { 
    display: "flex", 
    flexDirection: "column",
     gap: 16 },
  errorBox:  { 
    background: "rgba(248,113,113,.12)", 
    border: "1px solid rgba(248,113,113,.3)", 
    Colour: "var(--danger)", padding: "10px 14px", 
    borderRadius: "var(--radius)", fontSize: 15, 
    marginBottom: 8 },
  switchText:{ marginTop: 20, 
    textAlign: "center", fontSize: 15, 
    Colour: "var(--text2)" },
  link:      { Colour: "var(--accent)",
    textDecoration: "none", fontWeight: 500 },
};