
import React, { createContext, useContext, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login    from "./pages/Login";
import Register from "./pages/Register";
import Lobby    from "./pages/Lobby";
import Canvas   from "./pages/Canvas";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("canvas_user")); } 
    catch
     { 
      return null; 
}
  });

  const signIn = (userData, token) => {
    localStorage.setItem("canvas_token", token);
    localStorage.setItem("canvas_user",  JSON.stringify(userData));
    setUser(userData);
  };

  const signOut = () => {
    localStorage.removeItem("canvas_token");
    localStorage.removeItem("canvas_user");
    setUser(null);
  };

  return (
    <AuthCtx.Provider
    value={{ user, signIn, signOut, 
    token: localStorage.getItem("canvas_token") }}>
      {children}
    </AuthCtx.Provider>
  );
}

function Gatekeep({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
      <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/"         element={<Gatekeep><Lobby /></Gatekeep>} />
         <Route path="/room/:id" element={<Gatekeep><Canvas /></Gatekeep>} />
       <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
