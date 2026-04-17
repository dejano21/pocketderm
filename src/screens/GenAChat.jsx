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
        "That's a great question. Based on your scan history, everything looks stable. Remember, Derma Pocket provides informational guidance only — for clinical advice, please consult your connected dermatologist.";
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
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "16px 20px",
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
        flex: 1, overflowY: "auto", padding: "20px",
        paddingBottom: 8, background: "var(--bg)",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{
              display: "flex", gap: 10, marginBottom: 16,
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: msg.role === "user" ? "var(--primary)" : "linear-gradient(135deg, #f59e0b, #f97316)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {msg.role === "user"
                  ? <User size={16} color="white" />
                  : <Bot size={16} color="white" />}
              </div>
              <div style={{
                maxWidth: "70%",
                padding: "12px 16px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user" ? "var(--primary)" : "white",
                color: msg.role === "user" ? "white" : "var(--text)",
                fontSize: 14, lineHeight: 1.6,
                boxShadow: "var(--shadow)",
              }}>
                {msg.text}
              </div>
            </div>
          ))}

          {typing && (
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #f59e0b, #f97316)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bot size={16} color="white" />
              </div>
              <div style={{
                padding: "12px 16px", borderRadius: "16px 16px 16px 4px",
                background: "white", boxShadow: "var(--shadow)",
                fontSize: 14, color: "var(--text-muted)",
              }}>
                Typing...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: "6px 20px", background: "#fffbeb",
        borderTop: "1px solid #fde68a",
        display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
      }}>
        <AlertTriangle size={13} color="#d97706" />
        <span style={{ fontSize: 11, color: "#92400e" }}>
          GenA provides informational guidance only — not a medical diagnosis.
        </span>
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div style={{
          display: "flex", gap: 8, padding: "10px 20px",
          overflowX: "auto", background: "white", justifyContent: "center",
          flexWrap: "wrap",
        }}>
          {genASuggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              style={{
                padding: "8px 16px", borderRadius: 20,
                border: "1.5px solid var(--border)", background: "white",
                fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
                whiteSpace: "nowrap", cursor: "pointer",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "var(--primary-light)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "white"; }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        display: "flex", gap: 10, padding: "14px 20px",
        borderTop: "1px solid var(--border)", background: "white",
        paddingBottom: 20, justifyContent: "center",
      }}>
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 700 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask GenA a question..."
            style={{ flex: 1, borderRadius: 24, padding: "12px 18px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            style={{
              width: 46, height: 46, borderRadius: "50%",
              background: input.trim() ? "var(--primary)" : "var(--border)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s",
              flexShrink: 0,
            }}
          >
            <Send size={18} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}
