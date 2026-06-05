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
import OrgFilesPage from './pages/OrganizationFiles'
import OrgMembersPage from './pages/OrganizationMembers'
import OrgSettingsPage from './pages/OrganizationSettings'
import StatusPage from './pages/Status'
import ScrollToTop from './components/ScrollToTop'
import AboutPage from './pages/About'
import { StaticLayout } from './StaticLayout'
import NotFoundPage from './pages/NotFound'
import { PublicRoute } from './components/PublicRoute'

function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <Routes>
                <Route element={<PublicRoute />}>
                    <Route element={<AuthLayout />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                    </Route>
                </Route>
                <Route element={<ProtectedRoute />}>
                    <Route element={<MainLayout sidebar={<MenuSidebar />} />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/organizations" element={<OrganizationsPage />} />
                        <Route path="/dashboard/folder/:folderId" element={<DashboardPage />} />
                        <Route path="/orgs/:id/files" element={<OrgFilesPage />} />
                        <Route path="/orgs/:id/folder/:folderId" element={<OrgFilesPage />} />
                        <Route path="/orgs/:id/members" element={<OrgMembersPage />} />
                        <Route path="/orgs/:id/settings" element={<OrgSettingsPage />} />
                    </Route>

                    <Route element={<MainLayout sidebar={<ProfileSidebar />} />}>
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/usage" element={<StoragePage />} />
                        <Route path="/account" element={<AccountPage />} />
                    </Route>
                </Route>
                <Route element={<StaticLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/status" element={<StatusPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/404" element={<NotFoundPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
