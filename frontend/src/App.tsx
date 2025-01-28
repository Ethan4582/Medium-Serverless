import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Signup } from "./pages/Signup";
import { Signin } from "./pages/Signin";
import { Blog } from "./pages/Blog";


const isAuthenticated = false; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/blog/1" replace /> : <Navigate to="/signup" replace />
          }
        />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        <Route
          path="/blog/:id"
          element={isAuthenticated ? <Blog /> : <Navigate to="/signup" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
