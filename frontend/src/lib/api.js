const BASE = "/api";

function getToken() {
return localStorage.getItem("canvas_token");
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };//tells backend that we are sending json data
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }
);

  const data = await res.json();
  if (!res.ok) 
    throw new Error
  (data.error || "Request failed");
  return data;
}


export const register = (username, email, password) =>
  request("POST", "/auth/register", { 
    username, email, password 
  }
);

export const login = (email, password) =>
  request("POST", "/auth/login", { 
email, password 
  }
  );


export const roomcreator  = (name)   => 
  request("POST",   "/rooms",          { name });
export const listRooms   = ()       => 
  request("GET",    "/rooms");
export const getRoom     = (id)     => 
request("GET",    `/rooms/${id}`);
export const joinRoom    = (id)     => 
   request("POST",   `/rooms/${id}/join`);
export const randomRoom  = ()       => request("GET",    "/rooms/random");
export const fired    = (roomId, userId) => 
   request("DELETE", `/rooms/${roomId}/kick/${userId}`);
export const roomcloser   = (roomId) => request("POST",   `/rooms/${roomId}/close`);