import { useState } from "react";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

export default function ChatUI({ userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [quickMessages, setQuickMessages] = useState([
    "Available Trainings",
    "Help me find a Training",
  ]);

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
    <div className="flex flex-col w-full max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg border-t-4 border-blue-500 h-screen">
      <div className="flex-1 overflow-y-auto mb-4 space-y-3 px-4 py-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`${
                msg.sender === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-800"
              } p-4 rounded-lg max-w-xs sm:max-w-md break-words shadow-md`}
            >
              {msg.text.split("\n").map((line, i) => {
                const isTitle = /^\d+\.\s/.test(line);
                return (
                  <p
                    key={i}
                    className={`whitespace-pre-wrap ${
                      isTitle ? "font-semibold text-blue-700" : ""
                    }`}
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
            <div className="bg-gray-100 text-gray-800 p-4 rounded-lg max-w-xs sm:max-w-md break-words shadow-md flex items-center gap-2">
              <span>Typing</span>
              <span className="flex space-x-1">
                <span
                  className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0s" }}
                ></span>
                <span
                  className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></span>
                <span
                  className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick message buttons */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {quickMessages.map((msg, idx) => (
          <button
            key={idx}
            onClick={(e) => sendMessage(e, msg)}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition duration-200 transform hover:scale-105"
          >
            {msg}
          </button>
        ))}
      </div>

      {/* Message input and send button */}
      <form onSubmit={(e) => sendMessage(e)} className="flex gap-2 mt-auto">
        <input
          className="flex-1 p-4 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
          placeholder="Ask something about training programs..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition duration-200 transform hover:scale-105"
        >
          Send
        </button>
      </form>
    </div>
  );
}
