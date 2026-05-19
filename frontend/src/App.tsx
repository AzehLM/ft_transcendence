import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import HomePage from './pages/Home'
import PrivacyPage from './pages/Privacy'
import TermsPage from './pages/Terms'
import ProfilePage from './pages/Profile'
import DashboardPage from './pages/Dashboard'
import { AuthLayout } from './AuthLayout'
import { MainLayout } from './MainLayout'
import { MenuSidebar } from './components/MenuSidebar'
import { ProfileSidebar } from './components/ProfileSidebar'
import StoragePage from './pages/Storage'
import AccountPage from './pages/Account'
import OrganizationsPage from './pages/Organizations'
import { ProtectedRoute } from './components/ProtectedRoute'
import { OrgSidebar } from './components/OrgSidebar'
import OrgFilesPage from './pages/Orgs/OrgFilesPage'
import OrgMembersPage from './pages/Orgs/OrgMembersPage'
import OrgSettingsPage from './pages/Orgs/OrgSettingsPage'
import StatusPage from './pages/Status'
import ScrollToTop from './components/ScrollToTop'
import AboutPage from './pages/About/About'
import { Footer } from './components/Footer'
import NotFoundPage from './pages/NotFound'

function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <Routes>
                <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                </Route>
                <Route element={<ProtectedRoute />}>
                    <Route element={<MainLayout sidebar={<MenuSidebar />} />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                    </Route>

                    <Route element={<MainLayout sidebar={<ProfileSidebar />} />}>
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/usage" element={<StoragePage />} />
                        <Route path="/account" element={<AccountPage />} />
                        <Route path="/organizations" element={<OrganizationsPage />} />
                    </Route>
                    <Route element={<MainLayout sidebar={<OrgSidebar />} />}>
                        <Route path="/orgs/:id/files" element={<OrgFilesPage />} />
                        <Route path="/orgs/:id/members" element={<OrgMembersPage />} />
                        <Route path="/orgs/:id/settings" element={<OrgSettingsPage />} />
                    </Route>
                </Route>
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/status" element={<StatusPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Footer />
        </BrowserRouter>
    )
}

export default App
