import {
  useNavigate,
} from "react-router-dom";
import Lottie from "lottie-react";
import NoAccess from "../lottie-files-anim/no_access.json";

const MobileWarning = ({userId, handleSignOut}) => {

  const defaultOptions = {
    loop: true,
    autoplay: true,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  const handleButtonClick = () => {
    handleSignOut();
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white text-white px-6 text-center">
      <div className="w-80 h-80">
        <Lottie
          animationData={NoAccess}
          options={defaultOptions}
          height={200}
          width={200}
        />
      </div>
      <h3 className="text-xl font-semibold mt-4 max-w-md">
        For a better experience, please use a desktop device.
      </h3>
      <button
        onClick={handleButtonClick}
        className="mt-6 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300"
      >
        Home
      </button>
    </div>
  );
};

export default MobileWarning;