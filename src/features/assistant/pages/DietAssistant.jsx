import { useMemo, useState } from "react";
import { Bot, Calculator, Send, Sparkles, Utensils, Loader2 } from "lucide-react";
import SectionHeader from "../../../components/shared/SectionHeader";
import { useAuth } from "../../../hooks/useAuth";
import { apiClient } from "../../../services/apiClient";
import { calculateNutritionPlan } from "../../../utils/nutritionPlan";

const starterQuestions = [
  "Calculate my calorie and protein target",
  "I ate 200g chicken and 150g rice",
  "What should I eat if my protein is low?",
  "Why is my fat loss risk high?"
];

function buildAccountContext(account, plan) {
  return {
    user: {
      name: account.name,
      username: account.username
    },
    dietProfile: account.dietProfile || {},
    dailyCheckIn: account.dailyCheckIn || null,
    wearableData: account.wearableData || null,
    nutritionPlan: plan
  };
}

function planSummary(plan) {
  if (!plan.ready) return plan.message;

  const adjustment =
    plan.deficitCalories
      ? `${plan.deficitCalories} cal below maintenance`
      : plan.surplusCalories
        ? `${plan.surplusCalories} cal above maintenance`
        : "near maintenance";

  return `${plan.proteinTarget}g protein for ${plan.goal}. BMR: ${plan.bmr}, maintenance: ${plan.maintenance}, target is ${adjustment}.`;
}

export default function DietAssistant() {
  const { account } = useAuth();
  const plan = useMemo(() => calculateNutritionPlan(account), [account]);
  const [isThinking, setIsThinking] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Ask me about calories, protein, BMR, food estimates, fat loss, muscle gain, or why your diet risk is high."
    }
  ]);

  async function sendMessage(text = input) {
    const message = text.trim();
    if (!message || isThinking) return;

    const nextMessages = [...messages, { role: "user", text: message }];

    setMessages(nextMessages);
    setInput("");
    setIsThinking(true);

    try {
      const result = await apiClient.post("/ai/diet-chat", {
        message,
        messages: nextMessages.slice(-8),
        accountContext: buildAccountContext(account, plan)
      });

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: result.reply
        }
      ]);
    } catch (error) {
      const message =
        error.message === "Failed to fetch"
          ? "The AI backend is not reachable. Start the backend with 'npm run dev' and ensure your OpenRouter API key is set in .env."
          : error.message ||
            "The real AI service is not connected. Ensure the OpenRouter API key is valid.";

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: message
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="AI diet support"
        title="AI Diet Assistant"
        description="Ask about diet, food calories, protein, BMR, fat loss, muscle gain, and your saved health data."
      />

      <section className="assistant-layout">
        <article className="panel assistant-chat ai-premium-card">
          <div className="assistant-chat-header">
            <div className="stat-icon">
              <Bot size={22} className="text-primary" />
            </div>
            <div className="flex-grow" style={{ flex: 1 }}>
              <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p className="eyebrow" style={{ margin: 0 }}>Real AI Engine</p>
                <span className="ai-badge">
                  <Sparkles size={12} />
                  AI Assistant
                </span>
              </div>
              <h2 style={{ marginTop: '4px' }}>Diet Assistant</h2>
            </div>
          </div>

          <div className="assistant-messages">
            {messages.map((message, index) => (
              <div
                className={`assistant-message assistant-message-${message.role}`}
                key={`${message.role}-${index}`}
                style={message.role === 'assistant' ? {
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(34, 197, 94, 0.05))',
                  border: '1px solid rgba(14, 165, 233, 0.2)',
                  borderRadius: '18px 18px 18px 4px'
                } : {
                  borderRadius: '18px 18px 4px 18px'
                }}
              >
                {message.text.split("\n").map((line, i) => (
                  <p key={i} style={{ margin: i > 0 ? '8px 0 0' : 0 }}>{line}</p>
                ))}
              </div>
            ))}
            {isThinking && (
              <div className="assistant-message assistant-message-assistant" style={{
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(34, 197, 94, 0.05))',
                border: '1px solid rgba(14, 165, 233, 0.2)',
                borderRadius: '18px 18px 18px 4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Loader2 className="animate-spin text-primary" size={16} />
                  <p style={{ margin: 0 }}>AI is thinking...</p>
                </div>
              </div>
            )}
          </div>

          <form
            className="assistant-input"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              value={input}
              placeholder="Ask about calories, protein, meals, or BMR..."
              disabled={isThinking}
              onChange={(event) => setInput(event.target.value)}
            />
            <button className="btn btn-md btn-primary" type="submit" disabled={isThinking}>
              <Send size={18} />
              {isThinking ? "Thinking" : "Send"}
            </button>
          </form>
        </article>

        <aside className="page-stack">
          <article className="panel assistant-plan-card">
            <div className="stat-icon">
              <Calculator size={22} />
            </div>
            <p className="eyebrow">Your target</p>
            <h2>{plan.ready ? `${plan.calorieTarget} calories` : "Needs setup"}</h2>
            <p>
              {planSummary(plan)}
            </p>
          </article>

          <article className="panel">
            <div className="assistant-chat-header">
              <div className="stat-icon">
                <Sparkles size={22} />
              </div>
              <div>
                <p className="eyebrow">Quick prompts</p>
                <h2>Try asking</h2>
              </div>
            </div>

            <div className="assistant-prompts">
              {starterQuestions.map((question) => (
                <button
                  type="button"
                  key={question}
                  onClick={() => sendMessage(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="assistant-chat-header">
              <div className="stat-icon">
                <Utensils size={22} />
              </div>
              <div>
                <p className="eyebrow">Food calculator</p>
                <h2>Known foods</h2>
              </div>
            </div>
            <p>
              The real AI can estimate meals, explain macros, compare foods,
              and use your profile/check-in context when the backend API key is
              configured.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}
