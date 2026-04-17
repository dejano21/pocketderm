import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Bot, User, AlertTriangle } from "lucide-react";
import { genAConversation, genASuggestions, genAResponses } from "../data/mockData";

export default function GenAChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(genAConversation);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const response = genAResponses[text.trim()] ||
        "That's a great question. Based on your scan history, everything looks stable. Remember, Pocket-Derm provides informational guidance only — for clinical advice, please consult your connected dermatologist.";
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: response },
      ]);
      setTyping(false);
    }, 1200);
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      maxWidth: 430, margin: "0 auto",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "16px",
        borderBottom: "1px solid var(--border)", background: "white",
      }}>
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #f59e0b, #f97316)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Bot size={20} color="white" />
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700 }}>GenA Assistant</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Informational guidance only</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px",
        paddingBottom: 8, background: "var(--bg)",
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: "flex", gap: 8, marginBottom: 14,
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: msg.role === "user" ? "var(--primary)" : "linear-gradient(135deg, #f59e0b, #f97316)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {msg.role === "user"
                ? <User size={15} color="white" />
                : <Bot size={15} color="white" />}
            </div>
            <div style={{
              maxWidth: "78%",
              padding: "10px 14px",
              borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: msg.role === "user" ? "var(--primary)" : "white",
              color: msg.role === "user" ? "white" : "var(--text)",
              fontSize: 14, lineHeight: 1.55,
              boxShadow: "var(--shadow)",
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {typing && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bot size={15} color="white" />
            </div>
            <div style={{
              padding: "10px 14px", borderRadius: "14px 14px 14px 4px",
              background: "white", boxShadow: "var(--shadow)",
              fontSize: 14, color: "var(--text-muted)",
            }}>
              Typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: "6px 16px", background: "#fffbeb",
        borderTop: "1px solid #fde68a",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <AlertTriangle size={13} color="#d97706" />
        <span style={{ fontSize: 11, color: "#92400e" }}>
          GenA provides informational guidance only — not a medical diagnosis.
        </span>
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div style={{
          display: "flex", gap: 8, padding: "8px 16px",
          overflowX: "auto", background: "white",
        }}>
          {genASuggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              style={{
                padding: "8px 14px", borderRadius: 20,
                border: "1.5px solid var(--border)", background: "white",
                fontSize: 12, fontWeight: 500, color: "var(--text-secondary)",
                whiteSpace: "nowrap", cursor: "pointer",
                transition: "border-color 0.2s",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        display: "flex", gap: 8, padding: "12px 16px",
        borderTop: "1px solid var(--border)", background: "white",
        paddingBottom: 20,
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask GenA a question..."
          style={{ flex: 1, borderRadius: 24, padding: "10px 16px" }}
        />
        <button
          onClick={() => sendMessage(input)}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: input.trim() ? "var(--primary)" : "var(--border)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s",
          }}
        >
          <Send size={18} color="white" />
        </button>
      </div>
    </div>
  );
}
