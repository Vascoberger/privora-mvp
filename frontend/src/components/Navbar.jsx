// Top navigation bar — links to all five platform sections
import { NavLink } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-logo">Privora</span>
        <span className="brand-tagline">Private Market Access</span>
      </div>
      <ul className="navbar-links">
        <li>
          <NavLink to="/funds" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Fund Discovery
          </NavLink>
        </li>
        <li>
          <NavLink to="/onboarding" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Onboarding
          </NavLink>
        </li>
        <li>
          <NavLink to="/invest" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Invest
          </NavLink>
        </li>
        <li>
          <NavLink to="/portfolio" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Portfolio
          </NavLink>
        </li>
        <li>
          <NavLink to="/secondary-market" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Secondary Market
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
