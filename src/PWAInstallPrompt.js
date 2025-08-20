import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import InstallAnim from "./lottie-files-anim/download.json";

const PWAInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    setIsMobile(/android|iphone|ipad/i.test(userAgent));

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      console.log("👍 beforeinstallprompt event fired!");
      setInstallPrompt(event);
      setShowPrompt(true); // Show the modal
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("✅ User accepted the PWA installation");
        } else {
          console.log("❌ User dismissed the PWA installation");
        }
        setInstallPrompt(null);
        setShowPrompt(false);
      });
    }
  };

  return (
    isMobile &&
    showPrompt && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center w-11/12 max-w-sm animate-fadeIn relative">
          {/* Close button */}
          <button
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            onClick={() => setShowPrompt(false)}
          >
            ✖
          </button>

          {/* Lottie Animation */}
          <Lottie animationData={InstallAnim} loop className="w-36 h-36 mx-auto mb-4" />

          <h2 className="text-xl font-semibold text-gray-800">Get the Best Experience!</h2>
          <p className="text-gray-600 text-sm mt-2">
            Install our app for a smoother and faster experience.
          </p>

          {/* Buttons */}
          <div className="mt-4 space-y-2">
            <button
              className="w-full bg-green-500 text-white py-2 rounded-lg shadow-md hover:bg-green-600 transition-all"
              onClick={handleInstallClick}
            >
              Install Now
            </button>
            <button
              className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg shadow-md hover:bg-gray-400 transition-all"
              onClick={() => setShowPrompt(false)}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default PWAInstallPrompt;
