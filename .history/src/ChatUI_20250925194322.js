import { useState, useRef, useEffect } from "react";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

export default function ChatUI({ userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [quickMessages, setQuickMessages] = useState([
    "Available Trainings",
    "Help me find a Training",
  ]);
  const messagesEndRef = useRef(null);
  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isBotTyping]);

  const sendMessage = async (e, messageText = input) => {
    e?.preventDefault();
    if (!messageText.trim()) return;

    const userMessage = { sender: "user", text: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsBotTyping(true); // Bot starts typing

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ message: messageText }), // Send the message text to the backend
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      const botMessage = { sender: "bot", text: data.reply };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMsg = { sender: "bot", text: "Oops! Something went wrong." };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsBotTyping(false); // Bot stops typing
    }
  };

  return (
    <div
      className="flex flex-col w-full max-w-4xl mx-auto p-2 sm:p-6 bg-white shadow-lg rounded-lg border-t-4 border-blue-500 min-h-screen"
      style={{ minHeight: "100dvh" }}
    >
      <div className="flex-1 overflow-y-auto mb-2 sm:mb-4 space-y-3 px-2 sm:px-4 py-2" style={{ fontSize: "clamp(1.25rem, 6vw, 1.35rem)" }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`transition-all duration-500 ease-in-out transform ${
                msg.sender === "user"
                  ? "bg-blue-700 text-white animate-slide-in-right"
                  : "bg-gray-900 text-gray-100 animate-slide-in-left"
              } p-3 sm:p-4 rounded-xl max-w-[90vw] sm:max-w-md break-words shadow-md`}
              style={{ fontSize: "clamp(1.3rem, 7vw, 1.5rem)", wordBreak: 'break-word' }}
            >
              {msg.text.split("\n").map((line, i) => {
                const isTitle = /^\d+\.\s/.test(line);
                return (
                  <p
                    key={i}
                    className={`whitespace-pre-wrap ${isTitle ? "font-semibold text-yellow-300" : ""}`}
                    style={{ fontSize: isTitle ? "clamp(1.35rem, 8vw, 1.6rem)" : undefined }}
                  >
                    {line}
                  </p>
                );
              })}
            </div>
          </div>
        ))}
        {/* Typing Animation */}
        {isBotTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-900 text-gray-100 p-3 sm:p-4 rounded-xl max-w-[90vw] sm:max-w-md break-words shadow-md flex items-center gap-2 animate-fade-in">
              <span>Typing</span>
              <span className="flex space-x-1">
                <span
                  className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                  style={{ animationDelay: "0s" }}
                ></span>
                <span
                  className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></span>
                <span
                  className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick message buttons */}
      <div className="flex gap-2 sm:gap-3 mb-2 sm:mb-4 flex-wrap justify-center animate-fade-in">
        {quickMessages.map((msg, idx) => (
          <button
            key={idx}
            onClick={(e) => sendMessage(e, msg)}
            className="bg-blue-600 text-white px-4 sm:px-5 py-2 rounded-xl shadow hover:bg-blue-700 transition duration-200 transform hover:scale-105 text-base sm:text-lg"
            style={{ fontSize: "clamp(1.15rem, 6vw, 1.25rem)" }}
          >
            {msg}
          </button>
        ))}
      </div>

      {/* Message input and send button */}
      <form onSubmit={(e) => sendMessage(e)} className="flex gap-2 mt-auto w-full animate-fade-in">
        <input
          className="flex-1 p-3 sm:p-4 border border-gray-300 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 text-base sm:text-lg"
          placeholder="Ask something about training programs..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ fontSize: "clamp(1.15rem, 6vw, 1.25rem)" }}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow hover:bg-blue-700 transition duration-200 transform hover:scale-105 text-base sm:text-lg"
          style={{ fontSize: "clamp(1.15rem, 6vw, 1.25rem)" }}
        >
          Send
        </button>
      </form>

      {/* Animations CSS */}
      <style>{`
        @keyframes slide-in-right {
          0% { opacity: 0; transform: translateX(40px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-in-left {
          0% { opacity: 0; transform: translateX(-40px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.5s cubic-bezier(.4,0,.2,1);
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.5s cubic-bezier(.4,0,.2,1);
        }
        .animate-fade-in {
          animation: fade-in 0.5s cubic-bezier(.4,0,.2,1);
        }
      `}</style>
    </div>
  );
}
