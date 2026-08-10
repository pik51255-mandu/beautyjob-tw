import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { FEATURES } from "@shared/const";

// Lazy-load pages for code splitting
const JobList = lazy(() => import("./pages/JobList"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const JobForm = lazy(() => import("./pages/JobForm"));
const ResumeList = lazy(() => import("./pages/ResumeList"));
const ResumeDetail = lazy(() => import("./pages/ResumeDetail"));
const ResumeEdit = lazy(() => import("./pages/ResumeEdit"));
const JobsComingSoon = lazy(() => import("./pages/JobsComingSoon"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Disclaimer = lazy(() => import("./pages/legal/Disclaimer"));
const SalaryInfo = lazy(() => import("./pages/info/SalaryInfo"));
const Courses = lazy(() => import("./pages/info/Courses"));
const KoreanTechniques = lazy(() => import("./pages/info/KoreanTechniques"));
const SupplyMap = lazy(() => import("./pages/info/SupplyMap"));
const Community = lazy(() => import("./pages/Community"));
const CommunityDetail = lazy(() => import("./pages/CommunityDetail"));
const CommunityForm = lazy(() => import("./pages/CommunityForm"));
const Transfers = lazy(() => import("./pages/Transfers"));
const TransferDetail = lazy(() => import("./pages/TransferDetail"));
const TransferForm = lazy(() => import("./pages/TransferForm"));
const UsedItems = lazy(() => import("./pages/UsedItems"));
const UsedItemDetail = lazy(() => import("./pages/UsedItemDetail"));
const UsedItemForm = lazy(() => import("./pages/UsedItemForm"));
const MyPage = lazy(() => import("./pages/MyPage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<Layout><PageLoader /></Layout>}>
      <Switch>
        <Route path="/" component={() => <Layout><Home /></Layout>} />
        <Route path="/onboarding" component={() => <Layout><Onboarding /></Layout>} />

        {/* Jobs & Resumes — v4: 잠금 시 모든 채용 URL이 "即將開放" 페이지 */}
        {FEATURES.JOBS_ENABLED ? (
          <>
            <Route path="/jobs" component={() => <Layout><JobList /></Layout>} />
            <Route path="/jobs/new" component={() => <Layout><JobForm /></Layout>} />
            <Route path="/jobs/:id/edit" component={() => <Layout><JobForm /></Layout>} />
            <Route path="/jobs/:id" component={() => <Layout><JobDetail /></Layout>} />
            <Route path="/resumes" component={() => <Layout><ResumeList /></Layout>} />
            <Route path="/resume/edit" component={() => <Layout><ResumeEdit /></Layout>} />
            <Route path="/resumes/:id" component={() => <Layout><ResumeDetail /></Layout>} />
          </>
        ) : (
          <>
            <Route path="/jobs/:rest*" component={() => <Layout><JobsComingSoon /></Layout>} />
            <Route path="/jobs" component={() => <Layout><JobsComingSoon /></Layout>} />
            <Route path="/resumes/:rest*" component={() => <Layout><JobsComingSoon /></Layout>} />
            <Route path="/resumes" component={() => <Layout><JobsComingSoon /></Layout>} />
            <Route path="/resume/edit" component={() => <Layout><JobsComingSoon /></Layout>} />
          </>
        )}

        {/* Phase 1 정보 메뉴 */}
        <Route path="/salary-info" component={() => <Layout><SalaryInfo /></Layout>} />
        <Route path="/courses" component={() => <Layout><Courses /></Layout>} />
        <Route path="/korean-techniques" component={() => <Layout><KoreanTechniques /></Layout>} />
        <Route path="/supply-map" component={() => <Layout><SupplyMap /></Layout>} />

        {/* Legal */}
        <Route path="/terms" component={() => <Layout><Terms /></Layout>} />
        <Route path="/privacy" component={() => <Layout><Privacy /></Layout>} />
        <Route path="/disclaimer" component={() => <Layout><Disclaimer /></Layout>} />

        {/* Community */}
        <Route path="/community" component={() => <Layout><Community /></Layout>} />
        <Route path="/community/new" component={() => <Layout><CommunityForm /></Layout>} />
        <Route path="/community/:id/edit" component={() => <Layout><CommunityForm /></Layout>} />
        <Route path="/community/:id" component={() => <Layout><CommunityDetail /></Layout>} />

        {/* Transfers */}
        <Route path="/transfers" component={() => <Layout><Transfers /></Layout>} />
        <Route path="/transfers/new" component={() => <Layout><TransferForm /></Layout>} />
        <Route path="/transfers/:id/edit" component={() => <Layout><TransferForm /></Layout>} />
        <Route path="/transfers/:id" component={() => <Layout><TransferDetail /></Layout>} />

        {/* Used Items */}
        <Route path="/used-items" component={() => <Layout><UsedItems /></Layout>} />
        <Route path="/used-items/new" component={() => <Layout><UsedItemForm /></Layout>} />
        <Route path="/used-items/:id/edit" component={() => <Layout><UsedItemForm /></Layout>} />
        <Route path="/used-items/:id" component={() => <Layout><UsedItemDetail /></Layout>} />

        {/* MyPage */}
        <Route path="/mypage/:tab?" component={() => <Layout><MyPage /></Layout>} />

        {/* Auth */}
        <Route path="/login" component={() => <Login />} />
        <Route path="/register" component={() => <Register />} />

        {/* Admin */}
        <Route path="/admin" component={() => <AdminDashboard />} />

        <Route path="/404" component={() => <Layout><NotFound /></Layout>} />
        <Route component={() => <Layout><NotFound /></Layout>} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
