import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Login from "./components/login/Login";
import Register from "./components/register/Register";
import Feed from "./components/feed/Feed";
import Upload from "./components/upload/Upload";
import User from "./components/user/User";

function App() {
  return (
    <Routes>
      <Route path="/feed" element={<Feed />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/user/:userId" element={<User />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
