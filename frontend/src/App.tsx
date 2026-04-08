import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import ProfilePage from './pages/ProfilePage'

function App() {
    return (
        <BrowserRouter>
            <Routes>
            <Route path="/" element={<Navigate to="/home" />} />
            <Route path="/home" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
