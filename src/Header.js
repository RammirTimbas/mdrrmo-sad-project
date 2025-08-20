import mdrrmo_logo from "././User Folder/mdrrmo_logo.png";
import {
  FaHome,
  FaChalkboardTeacher,
  FaBullseye,
  FaSignInAlt,
} from "react-icons/fa";

const Header = ({
  scrollToSection,
  onLoginClick,
  handleInteraction,
  headerBackground,
  showLogin = false,
}) => {
  return (
    <header
      className="w-full sticky top-0 z-50 shadow-md transition-colors duration-300"
      style={{ backgroundColor: headerBackground }}
    >
      <div className="flex items-center justify-between px-4 py-3 md:px-6 h-[70px]">
        <div className="flex items-center gap-4 h-full min-w-0 flex-shrink">
          <button
            className="text-2xl text-black bg-transparent"
            onClick={handleInteraction}
          >
            ☰
          </button>
          <img src={mdrrmo_logo} alt="Logo" className="h-10 w-auto" />
          <div className="flex flex-col justify-center leading-none truncate">
            <span className="text-lg font-semibold hidden md:block truncate">
              MDRRMO Training Program Management System
            </span>
            <span className="text-base font-semibold block md:hidden truncate">
              MDRRMO - TPMS
            </span>
          </div>
        </div>

        {/* Right Side: Navigation */}
        <nav className="flex items-center h-full m-0 p-0 flex-shrink-0">
          {/* Desktop Nav */}
          <ul className="hidden md:flex items-center h-full m-0 p-0 space-x-6 text-sm font-medium leading-none">
            <li
              onClick={() => scrollToSection("carousel")}
              className="flex items-center h-full m-0 cursor-pointer hover:text-blue-600 transition"
            >
              Home
            </li>
            <li
              onClick={() => scrollToSection("training-programs")}
              className="flex items-center h-full m-0 cursor-pointer hover:text-blue-600 transition"
            >
              Training Programs
            </li>
            <li
              onClick={() => scrollToSection("mission-vision")}
              className="flex items-center h-full m-0 cursor-pointer hover:text-blue-600 transition"
            >
              Mission/Vision
            </li>
            {showLogin && (
              <li
                onClick={onLoginClick}
                className="flex items-center h-full m-0 bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition cursor-pointer"
              >
                Login
              </li>
            )}
          </ul>

          {/* Mobile Nav */}
          <ul className="md:hidden flex items-center h-full m-0 p-0 space-x-4 text-xl leading-none">
            <li
              onClick={() => scrollToSection("carousel")}
              className="flex items-center h-full cursor-pointer hover:text-blue-600 transition-colors"
            >
              <FaHome className="align-middle" />
            </li>
            <li
              onClick={() => scrollToSection("training-programs")}
              className="flex items-center h-full cursor-pointer hover:text-blue-600 transition-colors"
            >
              <FaChalkboardTeacher className="align-middle" />
            </li>
            <li
              onClick={() => scrollToSection("mission-vision")}
              className="flex items-center h-full cursor-pointer hover:text-blue-600 transition-colors"
            >
              <FaBullseye className="align-middle" />
            </li>
            {showLogin && (
              <li
                onClick={onLoginClick}
                className="flex items-center h-full cursor-pointer text-blue-600 hover:text-blue-700 transition-colors"
              >
                <FaSignInAlt className="align-middle" />
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
