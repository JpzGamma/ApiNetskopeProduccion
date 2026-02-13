import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/Shared/ProtectedRoute";
import Shell from "../components/Shared/Shell";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyPage from "./pages/VerifyPage";
import ForgotPage from "./pages/ForgotPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HomePage from "./pages/HomePage";
import WelcomePage from "./pages/WelcomePage";
import CciApps from "./pages/cciApps";
import URL_List from "./pages/URL_List";
import Users from "./pages/Users";
import Groups from "./pages/Groups";
import PrivateApps from "./pages/PrivateApps";
import Policies from "./pages/Policies";
import Score from "./pages/UserScore";
import Verify2FAPage from "./pages/Verify2FAPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/welcome" replace />} />

        {/* Públicas */}
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-2fa" element={<Verify2FAPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/forgot" element={<ForgotPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Privadas: ProtectedRoute -> Shell -> Outlet */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/cciApps" element={<CciApps />} />
            <Route path="/URL_List" element={<URL_List />} />
            <Route path="/Users" element={<Users />} />
            <Route path="/Groups" element={<Groups />} />
            <Route path="/PrivateApps" element={<PrivateApps />} />
            <Route path="/Policies" element={<Policies />} />
            <Route path="/Score" element={<Score />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
