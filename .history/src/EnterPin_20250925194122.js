import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function EnterPin({ onSubmit, error, onReturn }) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const inputsRef = useRef([]);
  const navigate = useNavigate();

  const handleChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault(); // <--- IMPORTANT: prevent default backspace behavior
      if (pin[index]) {
        const newPin = [...pin];
        newPin[index] = "";
        setPin(newPin);
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(pin.join(""));
  };

  const handleReturn = () => {
    if (onReturn) {
      onReturn();
    } else {
      navigate(-1);
    }
  };

  // Auto-submit ONLY if no error
  useEffect(() => {
    if (pin.every((digit) => digit !== "") && !error) {
      onSubmit(pin.join(""));
    }
  }, [pin, onSubmit, error]); // <-- make sure error is included here

  // Clear PIN on error
  useEffect(() => {
    if (error) {
      setPin(["", "", "", ""]);
      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 50); // small delay to guarantee DOM update
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
      <motion.form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col items-center gap-6 sm:p-8 sm:max-w-sm md:p-10 md:max-w-md lg:p-12 lg:max-w-lg"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h2 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-700 text-center">
          Enter Your PIN
        </h2>
        <div className="flex gap-3 sm:gap-4 md:gap-6 lg:gap-8 w-full justify-center">
          {pin.map((digit, idx) => (
            <input
              key={idx}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="1"
              autoComplete="one-time-code"
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              ref={(el) => (inputsRef.current[idx] = el)}
              className="w-12 h-14 sm:w-14 sm:h-16 md:w-16 md:h-20 lg:w-20 lg:h-24 text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl border-b-2 border-gray-300 focus:outline-none focus:border-blue-500 transition-all rounded-md shadow-sm bg-gray-50"
              style={{ fontFamily: "monospace", letterSpacing: "2px" }}
            />
          ))}
        </div>

        {error && (
          <motion.p
            className="text-red-500 text-sm sm:text-base md:text-lg font-medium mt-2 text-center"
            animate={{ x: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.4 }}
          >
            {error}
          </motion.p>
        )}

        <div className="flex flex-col gap-4 w-full mt-4">
          <button
            type="submit"
            className="confirm-btn w-full py-3 sm:py-3 md:py-4 text-lg sm:text-xl md:text-2xl rounded-lg"
          >
            Confirm
          </button>

          <p
            onClick={handleReturn}
            className="text-red-500 underline cursor-pointer w-full text-center text-base sm:text-lg md:text-xl mt-2"
          >
            Return
          </p>
        </div>
      </motion.form>
    </div>
  );
}
