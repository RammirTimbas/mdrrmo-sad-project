import mdrrmo_logo from "././User Folder/mdrrmo_logo.png";
import {
  FaHome,
  FaChalkboardTeacher,
  FaBullseye,
  FaSignInAlt,
  FaBars,   // ✅ Hamburger icon
} from "react-icons/fa";

const Header = ({
  scrollToSection,
  onLoginClick,
  handleInteraction,
  showLogin = false,
}) => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#0f172a] text-white shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 h-[70px]">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-3">
          {/* ✅ Hamburger (icon only, no background) */}
          <button
            onClick={handleInteraction}
            aria-label="Open Menu"
            className="p-0 m-0 bg-transparent border-0 shadow-none outline-none 
             text-2xl text-gray-300 hover:text-white transition"
            style={{ background: "none" }} // ✅ Force override global background
          >
            <FaBars />
          </button>


          <img src={mdrrmo_logo} alt="Logo" className="h-10 w-auto" />
          <span className="font-bold text-lg md:text-xl hidden md:block">
            MDRRMO Training Program Management System
          </span>
          <span className="font-bold text-lg md:hidden">MDRRMO TPMS</span>
        </div>

        {/* Middle: Navigation (Desktop Only) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <span
            onClick={() => scrollToSection("carousel")}
            className="cursor-pointer hover:text-blue-400 transition"
          >
            Home
          </span>
          <span
            onClick={() => scrollToSection("training-programs")}
            className="cursor-pointer hover:text-blue-400 transition"
          >
            Training Programs
          </span>
          <span
            onClick={() => scrollToSection("mission-vision")}
            className="cursor-pointer hover:text-blue-400 transition"
          >
            Mission/Vision
          </span>
        </nav>

        <div className="hidden md:block">
          {showLogin && (
            <button
              onClick={onLoginClick}
              className="px-6 py-2 font-semibold transition 
                 text-blue-500 hover:bg-blue-500 hover:text-white rounded-full"
              style={{
                backgroundColor: "transparent",
                border: "2px solid #3b82f6",
                boxShadow: "none",
              }}
            >
              Login
            </button>
          )}
        </div>

        {/* Mobile Nav (Icons Only, always visible on small screens) */}
        <nav className="flex md:hidden items-center gap-5 text-xl">
          <FaHome
            onClick={() => scrollToSection("carousel")}
            className="cursor-pointer hover:text-blue-400 transition"
          />
          <FaChalkboardTeacher
            onClick={() => scrollToSection("training-programs")}
            className="cursor-pointer hover:text-blue-400 transition"
          />
          <FaBullseye
            onClick={() => scrollToSection("mission-vision")}
            className="cursor-pointer hover:text-blue-400 transition"
          />
          {showLogin && (
            <FaSignInAlt
              onClick={onLoginClick}
              className="cursor-pointer text-blue-400 hover:text-blue-500 transition"
            />
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
