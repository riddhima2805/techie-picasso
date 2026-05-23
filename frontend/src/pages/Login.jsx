
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../lib/api";
import { useAuth } from "../App";

export default function Login() {
  const { signIn }    = useAuth();
  const navigate      = useNavigate();
  const [email, setEmail]       = useState(" ");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { user, token } = await login(email, password);
      signIn(user, token);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
    style={styles.page}>
      <div 
      className="card" style={styles.card}>
        <h1 style={styles.title}>Doodle Hub 🖌️</h1>
        <p 
        style={styles.sub}>Sign in to your account
        </p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form 
        onSubmit={handleSubmit} 
        style={styles.form}
        >
          <div className="field">
            <label>Email</label>
            <input type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} required autoFocus 
            />
          </div>
          <div className="field">
            <label>Password(No one is watching 👀)</label>
            <input type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            />
      </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Signing in… " : "Sign in"}
          </button>
        </form>

        <p style={styles.switchText}>
          Don't have an account? <Link to="/register" style={styles.link}>Register</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page:      { minHeight: "100vh", 
    display: "flex",
     alignItems: "center", 
    justifyContent: "center", 
    background: "var(--bg)" },
  card:      { width: "100%",
     maxWidth: 400 },
  title:     { fontFamily: "var(--font-head)", 
    fontSize: 30, fontWeight: 600,
     marginBottom: 5 },
  sub:       { Colour: "var(--text)",
     marginBottom: 25, 
     fontSize: 15 },
  form:      { display: "flex",
     flexDirection: "column",
      gap: 15 },
  errorBox:  { background: "rgba(248,113,113,.12)", 
     Colour: "var(--danger)",
      padding: "10px 15px", fontSize: 15,
       marginBottom: 8 },
  switchText:{ marginTop: 20,
     textAlign: "center",
      fontSize: 15, 
      Colour: "var(--text)" },
  link:      { Colour: "var(--accent)", 
    textDecoration: "none", 
    fontWeight: 500 },
};