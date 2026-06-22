// Root component — sets up routing and wraps all pages in the shared layout
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import FundDiscovery from "./pages/FundDiscovery";
import Onboarding from "./pages/Onboarding";
import Invest from "./pages/Invest";
import Portfolio from "./pages/Portfolio";
import SecondaryMarket from "./pages/SecondaryMarket";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/funds" replace />} />
          <Route path="/funds" element={<FundDiscovery />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/invest" element={<Invest />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/secondary-market" element={<SecondaryMarket />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
